// @version socket.io ^4.5.0

// HUMAN TASKS:
// 1. Configure SSL certificates for WebSocket server in production
// 2. Set up CloudWatch alarms for WebSocket response times > 200ms
// 3. Configure WebSocket connection limits and rate limiting
// 4. Set up WebSocket load balancing in production
// 5. Configure WebSocket event monitoring and analytics
// 6. Set up automatic WebSocket room cleanup intervals

import { Server, Socket } from 'socket.io';
import { NotificationHandler } from './handlers/notification.handler';
import { PantryWebSocketHandler } from './handlers/pantry.handler';
import { RecipeHandler } from './handlers/recipe.handler';
import { logger } from '../utils/logger';

/**
 * Core WebSocket server implementation for PantryChef application
 * Addresses requirements:
 * - Real-time WebSocket Connections (1.1 System Overview)
 * - Digital Pantry Management (1.2 Scope/Core Capabilities)
 * - Recipe Matching (1.2 Scope/Core Capabilities)
 * - Performance Requirements (APPENDICES/C. SYSTEM METRICS)
 */
export class WebSocketServer {
    private io: Server;
    private notificationHandler: NotificationHandler;
    private pantryHandler: PantryWebSocketHandler;
    private recipeHandler: RecipeHandler;
    private connectedClients: Map<string, Socket>;

    /**
     * Initializes the WebSocket server with all required handlers
     * Addresses requirement: Real-time WebSocket Connections - Server initialization
     */
    constructor(httpServer: any) {
        // Initialize Socket.IO with performance optimizations
        this.io = new Server(httpServer, {
            cors: {
                origin: process.env.ALLOWED_ORIGINS?.split(',') || [],
                methods: ['GET', 'POST'],
                credentials: true
            },
            pingTimeout: 10000,
            pingInterval: 5000,
            transports: ['websocket', 'polling'],
            maxHttpBufferSize: 1e6 // 1MB
        });

        // Initialize handlers
        this.notificationHandler = new NotificationHandler();
        this.pantryHandler = new PantryWebSocketHandler();
        this.recipeHandler = new RecipeHandler();
        this.connectedClients = new Map<string, Socket>();

        logger.info('WebSocket server initialized', {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV
        });
    }

    /**
     * Starts the WebSocket server with security and performance configurations
     * Addresses requirements:
     * - Real-time WebSocket Connections - Server startup
     * - Performance Requirements - Sub-200ms response times
     */
    public start(): void {
        try {
            // Set up authentication middleware
            this.io.use(async (socket, next) => {
                const token = socket.handshake.auth.token;
                if (!token) {
                    logger.error('Authentication failed - missing token', {
                        socketId: socket.id
                    });
                    return next(new Error('Authentication failed'));
                }

                try {
                    // Verify JWT token
                    const userId = await this.verifyToken(token);
                    socket.data.userId = userId;
                    next();
                } catch (error) {
                    logger.error('Authentication failed - invalid token', {
                        socketId: socket.id,
                        error
                    });
                    next(new Error('Authentication failed'));
                }
            });

            // Set up connection handler
            this.io.on('connection', (socket: Socket) => {
                this.handleConnection(socket);
            });

            logger.info('WebSocket server started successfully', {
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Failed to start WebSocket server', {
                error,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    /**
     * Handles new client connections with authentication and room management
     * Addresses requirement: Real-time WebSocket Connections - Connection handling
     */
    private handleConnection(socket: Socket): void {
        const startTime = Date.now();
        const userId = socket.data.userId;

        try {
            // Track connected client
            this.connectedClients.set(userId, socket);

            // Set up handlers for the connected client
            this.notificationHandler.handleConnection(socket, userId);
            this.pantryHandler.handlePantrySync(socket, userId);

            // Set up disconnection handler
            socket.on('disconnect', () => {
                this.handleDisconnection(socket);
            });

            // Set up event handlers for real-time operations
            this.setupEventHandlers(socket);

            // Log successful connection
            const connectionTime = Date.now() - startTime;
            logger.info('Client connected successfully', {
                userId,
                socketId: socket.id,
                connectionTime,
                timestamp: new Date().toISOString()
            });

            // Monitor connection time performance
            if (connectionTime > 200) {
                logger.warn('Connection time exceeded threshold', {
                    userId,
                    socketId: socket.id,
                    connectionTime
                });
            }
        } catch (error) {
            logger.error('Error handling client connection', {
                userId,
                socketId: socket.id,
                error,
                timestamp: new Date().toISOString()
            });
            socket.disconnect(true);
        }
    }

    /**
     * Handles client disconnection with proper cleanup
     * Addresses requirement: Real-time WebSocket Connections - Disconnection handling
     */
    private handleDisconnection(socket: Socket): void {
        const userId = socket.data.userId;

        try {
            // Clean up handlers
            this.notificationHandler.handleDisconnection(userId);
            
            // Remove from connected clients
            this.connectedClients.delete(userId);

            // Clean up socket rooms
            socket.rooms.forEach(room => {
                socket.leave(room);
            });

            logger.info('Client disconnected successfully', {
                userId,
                socketId: socket.id,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Error handling client disconnection', {
                userId,
                socketId: socket.id,
                error,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Sets up event handlers for real-time operations
     * Addresses requirements:
     * - Digital Pantry Management - Real-time updates
     * - Recipe Matching - Real-time recipe operations
     */
    private setupEventHandlers(socket: Socket): void {
        const userId = socket.data.userId;

        // Pantry event handlers
        socket.on('pantry:item-update', async (data) => {
            const startTime = Date.now();
            try {
                await this.pantryHandler.handleItemUpdate(
                    socket,
                    userId,
                    data.item,
                    data.action
                );
                this.logPerformance('pantry:item-update', startTime);
            } catch (error) {
                this.handleEventError(socket, 'pantry:item-update', error);
            }
        });

        socket.on('pantry:quantity-update', async (data) => {
            const startTime = Date.now();
            try {
                await this.pantryHandler.handleQuantityUpdate(
                    socket,
                    userId,
                    data.itemId,
                    data.quantity
                );
                this.logPerformance('pantry:quantity-update', startTime);
            } catch (error) {
                this.handleEventError(socket, 'pantry:quantity-update', error);
            }
        });

        // Recipe event handlers
        socket.on('recipe:match', async (data) => {
            const startTime = Date.now();
            try {
                await this.recipeHandler.handleRecipeMatch(
                    socket,
                    data.ingredientIds
                );
                this.logPerformance('recipe:match', startTime);
            } catch (error) {
                this.handleEventError(socket, 'recipe:match', error);
            }
        });

        socket.on('recipe:recommendations', async (data) => {
            const startTime = Date.now();
            try {
                await this.recipeHandler.handleRecommendations(socket, data);
                this.logPerformance('recipe:recommendations', startTime);
            } catch (error) {
                this.handleEventError(socket, 'recipe:recommendations', error);
            }
        });

        // Notification event handlers
        socket.on('notification:subscribe', (channels: string[]) => {
            channels.forEach(channel => {
                socket.join(`${userId}:${channel}`);
            });
        });

        // Heartbeat handler for connection monitoring
        socket.on('ping', () => {
            socket.emit('pong', { timestamp: new Date().toISOString() });
        });
    }

    /**
     * Verifies JWT token for WebSocket authentication
     * Addresses requirement: Real-time WebSocket Connections - Security
     */
    private async verifyToken(token: string): Promise<string> {
        try {
            // Token verification logic here
            // This would typically use JWT verification
            return 'userId'; // Replace with actual verification
        } catch (error) {
            logger.error('Token verification failed', { error });
            throw new Error('Invalid token');
        }
    }

    /**
     * Logs performance metrics for WebSocket operations
     * Addresses requirement: Performance Requirements - Sub-200ms response times
     */
    private logPerformance(operation: string, startTime: number): void {
        const responseTime = Date.now() - startTime;
        logger.info('Operation performance', {
            operation,
            responseTime,
            timestamp: new Date().toISOString()
        });

        if (responseTime > 200) {
            logger.warn('Operation exceeded response time threshold', {
                operation,
                responseTime,
                threshold: 200
            });
        }
    }

    /**
     * Handles and logs WebSocket event errors
     * Addresses requirement: Real-time WebSocket Connections - Error handling
     */
    private handleEventError(socket: Socket, event: string, error: any): void {
        logger.error('WebSocket event error', {
            event,
            userId: socket.data.userId,
            socketId: socket.id,
            error,
            timestamp: new Date().toISOString()
        });

        socket.emit('error', {
            event,
            message: 'Operation failed',
            timestamp: new Date().toISOString()
        });
    }
}

export default WebSocketServer;