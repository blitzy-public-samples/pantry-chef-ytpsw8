import { Socket } from 'socket.io'; // ^4.5.0
import { logger } from '../../utils/logger';
import { NotificationService } from '../../services/notification.service';
import { ERROR_CODES } from '../../utils/constants';
import { injectable } from 'tsyringe';

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
@injectable()
export class NotificationHandler {
  private connectedClients: Map<string, Socket>;
  private readonly notificationService: NotificationService;

  /**
   * Initializes the notification handler with required services
   * Addresses requirement: Real-time WebSocket Connections - Service initialization
   */
  constructor(notificationService: NotificationService) {
    this.notificationService = notificationService;
    this.connectedClients = new Map<string, Socket>();

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

      // Store client connection
      this.connectedClients.set(userId, socket);

      // Set up client-specific event listeners
      this.setupEventListeners(socket, userId);

      logger.info('Client connected successfully', {
        userId,
        socketId: socket.id,
        connectionTime: new Date().toISOString(),
      });

      // Send connection acknowledgment
      socket.emit('connection_established', {
        status: 'connected',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Error handling client connection', {
        userId,
        error,
        socketId: socket.id,
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
      // Remove client from connected clients map
      const socket = this.connectedClients.get(userId);
      if (socket) {
        // Clean up event listeners
        socket.removeAllListeners();
        this.connectedClients.delete(userId);

        logger.info('Client disconnected successfully', {
          userId,
          socketId: socket.id,
          disconnectionTime: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      logger.error('Error handling client disconnection', {
        userId,
        error,
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

      // Check for active WebSocket connection
      const socket = this.connectedClients.get(userId);

      if (socket && socket.connected) {
        // Attempt WebSocket delivery
        await this.notificationService.sendWebSocketNotification(userId, notificationData);

        logger.info('WebSocket notification sent successfully', {
          userId,
          notificationType: notificationData.type,
          timestamp: new Date().toISOString(),
        });

        return true;
      } else {
        // Fallback to push notification
        await this.notificationService.sendPushNotification(userId, notificationData);

        logger.info('Fallback push notification sent', {
          userId,
          notificationType: notificationData.type,
          timestamp: new Date().toISOString(),
        });

        return true;
      }
    } catch (error: any) {
      logger.error('Failed to send notification', {
        userId,
        error,
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
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
        userIds.map((userId) => this.sendNotification(userId, notificationData))
      );

      // Track delivery statistics
      const successCount = deliveryResults.filter(
        (result) => result.status === 'fulfilled' && result.value
      ).length;

      logger.info('Broadcast notification completed', {
        totalRecipients: userIds.length,
        successfulDeliveries: successCount,
        failedDeliveries: userIds.length - successCount,
        notificationType: notificationData.type,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Error broadcasting notification', {
        error,
        recipientCount: userIds.length,
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
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
        channels.forEach((channel) => {
          socket.join(`${userId}:${channel}`);
        });

        logger.info('Client subscribed to notification channels', {
          userId,
          channels,
          socketId: socket.id,
        });
      } catch (error: any) {
        logger.error('Error subscribing to notification channels', {
          userId,
          channels,
          error,
        });
      }
    });

    // Handle client unsubscription from notification channels
    socket.on('unsubscribe_notifications', (channels: string[]) => {
      try {
        channels.forEach((channel) => {
          socket.leave(`${userId}:${channel}`);
        });

        logger.info('Client unsubscribed from notification channels', {
          userId,
          channels,
          socketId: socket.id,
        });
      } catch (error: any) {
        logger.error('Error unsubscribing from notification channels', {
          userId,
          channels,
          error,
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
          timestamp: new Date().toISOString(),
        });
      } catch (error: any) {
        logger.error('Error processing notification acknowledgment', {
          userId,
          notificationId,
          error,
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
