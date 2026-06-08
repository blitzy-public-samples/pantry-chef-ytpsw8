import { Socket, Server } from 'socket.io'; // ^4.5.0
import { logger } from '../../utils/logger';
import { NotificationService } from '../../services/notification.service';
import { ERROR_CODES } from '../../utils/constants';

// HUMAN TASKS:
// 1. Configure WebSocket server SSL certificates in production
// 2. Set up monitoring for WebSocket connection metrics
// 3. Configure client reconnection strategies
// 4. Set up load balancing for WebSocket connections
// 5. Configure WebSocket event logging and analytics

/**
 * Handles WebSocket events related to notifications in the PantryChef application
 * Addresses requirements: Real-time WebSocket Connections, Push Notifications, Expiration Tracking
 */
export class NotificationHandler {
    private readonly io: Server;
    private readonly notificationService: NotificationService;

    /**
     * Initializes the notification handler with required services
     * Addresses requirement: Real-time WebSocket Connections - Service initialization
     *
     * The handler holds a reference to the live Socket.IO {@link Server} instead of a
     * process-local connection registry. Connection presence is derived from Socket.IO
     * rooms which, combined with the Redis adapter configured on the server, remain
     * correct across multiple backend instances. The previous in-memory
     * `Map<userId, Socket>` only tracked sockets attached to the current process and
     * silently failed to locate users connected to other nodes, so it could not support
     * multi-node fan-out.
     */
    constructor(notificationService: NotificationService, io: Server) {
        this.notificationService = notificationService;
        this.io = io;

        logger.info('NotificationHandler initialized successfully');
    }

    /**
     * Handles new WebSocket client connections and sets up event listeners
     * Addresses requirement: Real-time WebSocket Connections - Connection handling
     */
    public handleConnection(socket: Socket, userId: string): void {
        try {
            // Validate connection parameters
            if (!userId) {
                logger.error('Invalid connection attempt - missing userId');
                socket.disconnect(true);
                return;
            }

            // Join the user-scoped room so notifications can be delivered by room name.
            // With the Redis adapter attached to the server this room membership is shared
            // across all backend instances, enabling cross-node delivery. `socket.join`
            // may return a Promise when an adapter is configured; it is intentionally
            // fire-and-forget here (the room is also re-derivable on demand), and the
            // `void` operator documents the discarded result for the no-floating-promises rule.
            void socket.join(userId);

            // Set up client-specific event listeners
            this.setupEventListeners(socket, userId);

            logger.info('Client connected successfully', {
                userId,
                socketId: socket.id,
                connectionTime: new Date().toISOString()
            });

            // Send connection acknowledgment
            socket.emit('connection_established', {
                status: 'connected',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Error handling client connection', {
                userId,
                error,
                socketId: socket.id
            });
            socket.disconnect(true);
        }
    }

    /**
     * Handles client disconnection events and cleanup
     * Addresses requirement: Real-time WebSocket Connections - Disconnection handling
     */
    public handleDisconnection(userId: string): void {
        try {
            // No process-local cleanup is required: Socket.IO automatically removes a
            // disconnecting socket from every room it joined (including the user-scoped
            // room joined in handleConnection), and that removal is propagated through the
            // Redis adapter to all instances. Disconnection is therefore handled correctly
            // for multi-node deployments without tracking sockets in process memory.
            logger.info('Client disconnected successfully', {
                userId,
                disconnectionTime: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Error handling client disconnection', {
                userId,
                error
            });
        }
    }

    /**
     * Sends a notification to a specific user with WebSocket and push notification fallback
     * Addresses requirements: Push Notifications, Real-time Updates
     */
    public async sendNotification(userId: string, notificationData: any): Promise<boolean> {
        try {
            // Validate notification data
            if (!this.validateNotificationData(notificationData)) {
                throw new Error('Invalid notification data structure');
            }

            // Check for an active WebSocket connection across ALL backend instances.
            // `io.in(userId).fetchSockets()` consults the Redis adapter, so it returns
            // sockets connected to any node in the cluster — not just the current process.
            // This replaces the former process-local Map lookup that could not see users
            // connected elsewhere and therefore mis-routed deliveries under horizontal scale.
            const activeSockets = await this.io.in(userId).fetchSockets();

            if (activeSockets.length > 0) {
                // Attempt WebSocket delivery
                await this.notificationService.sendWebSocketNotification(userId, notificationData);
                
                logger.info('WebSocket notification sent successfully', {
                    userId,
                    notificationType: notificationData.type,
                    timestamp: new Date().toISOString()
                });
                
                return true;
            } else {
                // Fallback to push notification
                await this.notificationService.sendPushNotification(userId, notificationData);
                
                logger.info('Fallback push notification sent', {
                    userId,
                    notificationType: notificationData.type,
                    timestamp: new Date().toISOString()
                });
                
                return true;
            }
        } catch (error) {
            logger.error('Failed to send notification', {
                userId,
                error,
                code: ERROR_CODES.INTERNAL_SERVER_ERROR
            });
            return false;
        }
    }

    /**
     * Broadcasts a notification to multiple users with delivery tracking
     * Addresses requirement: Real-time Updates - Broadcast notifications
     */
    public async broadcastNotification(userIds: string[], notificationData: any): Promise<void> {
        try {
            const deliveryResults = await Promise.allSettled(
                userIds.map(userId => this.sendNotification(userId, notificationData))
            );

            // Track delivery statistics
            const successCount = deliveryResults.filter(
                result => result.status === 'fulfilled' && result.value
            ).length;

            logger.info('Broadcast notification completed', {
                totalRecipients: userIds.length,
                successfulDeliveries: successCount,
                failedDeliveries: userIds.length - successCount,
                notificationType: notificationData.type,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Error broadcasting notification', {
                error,
                recipientCount: userIds.length,
                code: ERROR_CODES.INTERNAL_SERVER_ERROR
            });
            throw error;
        }
    }

    /**
     * Sets up WebSocket event listeners for a connected client
     * Addresses requirement: Real-time WebSocket Connections - Event handling
     */
    private setupEventListeners(socket: Socket, userId: string): void {
        // Handle client subscription to notification channels
        socket.on('subscribe_notifications', (channels: string[]) => {
            try {
                channels.forEach(channel => {
                    socket.join(`${userId}:${channel}`);
                });
                
                logger.info('Client subscribed to notification channels', {
                    userId,
                    channels,
                    socketId: socket.id
                });
            } catch (error) {
                logger.error('Error subscribing to notification channels', {
                    userId,
                    channels,
                    error
                });
            }
        });

        // Handle client unsubscription from notification channels
        socket.on('unsubscribe_notifications', (channels: string[]) => {
            try {
                channels.forEach(channel => {
                    socket.leave(`${userId}:${channel}`);
                });
                
                logger.info('Client unsubscribed from notification channels', {
                    userId,
                    channels,
                    socketId: socket.id
                });
            } catch (error) {
                logger.error('Error unsubscribing from notification channels', {
                    userId,
                    channels,
                    error
                });
            }
        });

        // Handle notification acknowledgments
        socket.on('notification_ack', (notificationId: string) => {
            try {
                logger.info('Notification acknowledged by client', {
                    userId,
                    notificationId,
                    socketId: socket.id,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                logger.error('Error processing notification acknowledgment', {
                    userId,
                    notificationId,
                    error
                });
            }
        });

        // Handle client ping/heartbeat
        socket.on('ping', () => {
            socket.emit('pong', { timestamp: new Date().toISOString() });
        });
    }

    /**
     * Validates notification data structure
     * Addresses requirement: Real-time Updates - Data validation
     */
    private validateNotificationData(data: any): boolean {
        return !!(
            data &&
            typeof data === 'object' &&
            data.type &&
            typeof data.type === 'string' &&
            data.payload &&
            typeof data.payload === 'object'
        );
    }
}

export default NotificationHandler;