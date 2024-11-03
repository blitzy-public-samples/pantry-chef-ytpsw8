import { injectable } from 'tsyringe'; // ^3.0.0
import { Server } from 'socket.io'; // ^4.6.0
import * as admin from 'firebase-admin'; // ^11.0.0
import nodemailer, { Transporter } from 'nodemailer'; // ^6.9.0
import { Channel } from 'amqplib'; // ^0.10.0
import { NotificationSettings, UserPreferences } from '../interfaces/user.interface';
import { logger } from '../utils/logger';
import { createChannel } from '../config/rabbitmq';

// HUMAN TASKS:
// 1. Configure Firebase Admin SDK credentials in environment:
//    - FIREBASE_CREDENTIALS=path/to/firebase-credentials.json
// 2. Set up SMTP server configuration:
//    - SMTP_CONFIG={"host":"smtp.example.com","port":587,"auth":{"user":"user","pass":"pass"}}
// 3. Configure RabbitMQ connection string:
//    - RABBITMQ_URL=amqp://user:password@host:5672
// 4. Set up monitoring for notification delivery rates and failures
// 5. Configure notification templates in the email service

/**
 * Core notification service class for handling all types of notifications in PantryChef
 * Addresses requirements: Push Notifications, Real-time Updates, Expiration Tracking
 */
@injectable()
export class NotificationService {
    private rabbitmqChannel: Channel;
    private firebaseApp: admin.app.App;
    private socketServer: Server;
    private emailTransporter: Transporter;
    private readonly NOTIFICATION_QUEUE = process.env.NOTIFICATION_QUEUE || 'notifications';

    /**
     * Initializes notification service with required connections and configurations
     * Addresses requirement: Push Notifications - Service initialization
     */
    constructor(socketServer: Server) {
        this.socketServer = socketServer;
        this.initialize().catch(error => {
            logger.error('Failed to initialize notification service', { error });
            throw error;
        });
    }

    /**
     * Initializes all notification service dependencies and connections
     * Addresses requirement: System Architecture - Service initialization
     */
    private async initialize(): Promise<void> {
        try {
            // Initialize Firebase Admin SDK
            const firebaseCredentials = JSON.parse(process.env.FIREBASE_CREDENTIALS);
            this.firebaseApp = admin.initializeApp({
                credential: admin.credential.cert(firebaseCredentials)
            });

            // Initialize RabbitMQ channel
            this.rabbitmqChannel = await createChannel(await createChannel(undefined));

            // Initialize SMTP transport
            const smtpConfig = JSON.parse(process.env.SMTP_CONFIG);
            this.emailTransporter = nodemailer.createTransport(smtpConfig);

            // Start notification queue processor
            this.processNotificationQueue();

            logger.info('Notification service initialized successfully');
        } catch (error) {
            logger.error('Notification service initialization failed', { error });
            throw error;
        }
    }

    /**
     * Sends push notifications to user devices using Firebase Cloud Messaging
     * Addresses requirement: Push Notifications - Device notifications
     */
    public async sendPushNotification(userId: string, notificationData: any): Promise<void> {
        try {
            // Validate user notification preferences
            const userPrefs = await this.getUserNotificationPreferences(userId);
            if (!userPrefs.notificationSettings.pushNotifications) {
                logger.info('Push notifications disabled for user', { userId });
                return;
            }

            // Format FCM notification payload
            const message = {
                notification: {
                    title: notificationData.title,
                    body: notificationData.body
                },
                data: {
                    ...notificationData.data,
                    timestamp: new Date().toISOString()
                },
                token: notificationData.deviceToken
            };

            // Send notification through Firebase
            const response = await this.firebaseApp.messaging().send(message);
            logger.info('Push notification sent successfully', { 
                userId, 
                messageId: response 
            });
        } catch (error) {
            logger.error('Failed to send push notification', { 
                userId, 
                error 
            });
            throw error;
        }
    }

    /**
     * Sends email notifications using configured SMTP service
     * Addresses requirement: Real-time Updates - Email notifications
     */
    public async sendEmailNotification(userEmail: string, emailData: any): Promise<void> {
        try {
            // Validate email template
            if (!emailData.template) {
                throw new Error('Email template not specified');
            }

            // Send email through nodemailer transport
            const result = await this.emailTransporter.sendMail({
                from: process.env.SMTP_FROM_ADDRESS,
                to: userEmail,
                subject: emailData.subject,
                html: emailData.template,
                text: emailData.text,
                attachments: emailData.attachments
            });

            logger.info('Email notification sent successfully', { 
                userEmail, 
                messageId: result.messageId 
            });
        } catch (error) {
            logger.error('Failed to send email notification', { 
                userEmail, 
                error 
            });
            throw error;
        }
    }

    /**
     * Sends real-time notifications via WebSocket connection
     * Addresses requirement: Real-time Updates - WebSocket notifications
     */
    public async sendWebSocketNotification(userId: string, notificationData: any): Promise<void> {
        try {
            // Verify active socket connection
            const userSocket = this.socketServer.sockets.sockets.get(userId);
            if (!userSocket) {
                logger.warn('No active socket connection for user', { userId });
                return;
            }

            // Emit notification to user's socket room
            this.socketServer.to(userId).emit('notification', {
                type: notificationData.type,
                payload: notificationData.payload,
                timestamp: new Date().toISOString()
            });

            logger.info('WebSocket notification sent successfully', { userId });
        } catch (error) {
            logger.error('Failed to send WebSocket notification', { 
                userId, 
                error 
            });
            throw error;
        }
    }

    /**
     * Processes notifications from RabbitMQ queue
     * Addresses requirement: System Architecture - Asynchronous processing
     */
    private async processNotificationQueue(): Promise<void> {
        try {
            await this.rabbitmqChannel.assertQueue(this.NOTIFICATION_QUEUE, {
                durable: true
            });

            // Process messages with acknowledgment
            await this.rabbitmqChannel.consume(
                this.NOTIFICATION_QUEUE,
                async (message) => {
                    if (!message) return;

                    try {
                        const notification = JSON.parse(message.content.toString());
                        
                        // Route to appropriate delivery method
                        switch (notification.type) {
                            case 'push':
                                await this.sendPushNotification(
                                    notification.userId,
                                    notification.data
                                );
                                break;
                            case 'email':
                                await this.sendEmailNotification(
                                    notification.userEmail,
                                    notification.data
                                );
                                break;
                            case 'websocket':
                                await this.sendWebSocketNotification(
                                    notification.userId,
                                    notification.data
                                );
                                break;
                            default:
                                throw new Error(`Unknown notification type: ${notification.type}`);
                        }

                        // Acknowledge successful processing
                        this.rabbitmqChannel.ack(message);
                    } catch (error) {
                        // Handle processing errors
                        logger.error('Failed to process notification message', { error });
                        this.rabbitmqChannel.nack(message, false, false);
                    }
                },
                { noAck: false }
            );

            logger.info('Notification queue processor started successfully');
        } catch (error) {
            logger.error('Failed to start notification queue processor', { error });
            throw error;
        }
    }

    /**
     * Checks for items nearing expiration and sends notifications
     * Addresses requirement: Expiration Tracking - Pantry item notifications
     */
    public async checkExpiringItems(userId: string): Promise<void> {
        try {
            // Query pantry database for user's items
            const expiringItems = await this.getExpiringItems(userId);
            
            // Generate notifications for each expiring item
            for (const item of expiringItems) {
                const notificationData = {
                    type: 'expiration',
                    title: 'Item Expiring Soon',
                    body: `${item.name} will expire on ${item.expirationDate}`,
                    data: {
                        itemId: item.id,
                        expirationDate: item.expirationDate,
                        category: item.category
                    }
                };

                // Queue notification for processing
                await this.rabbitmqChannel.sendToQueue(
                    this.NOTIFICATION_QUEUE,
                    Buffer.from(JSON.stringify({
                        type: 'push',
                        userId,
                        data: notificationData
                    })),
                    { persistent: true }
                );
            }

            logger.info('Expiring items check completed', { 
                userId, 
                itemCount: expiringItems.length 
            });
        } catch (error) {
            logger.error('Failed to check expiring items', { 
                userId, 
                error 
            });
            throw error;
        }
    }

    /**
     * Helper method to retrieve user notification preferences
     */
    private async getUserNotificationPreferences(userId: string): Promise<UserPreferences> {
        // Implementation would fetch user preferences from database
        // Placeholder for demonstration
        return {
            theme: 'LIGHT',
            language: 'en',
            measurementSystem: 'METRIC',
            notificationSettings: {
                expirationAlerts: true,
                lowStockAlerts: true,
                recipeRecommendations: true,
                emailNotifications: true,
                pushNotifications: true
            },
            cuisinePreferences: [],
            skillLevel: 'INTERMEDIATE'
        };
    }

    /**
     * Helper method to retrieve expiring items for a user
     */
    private async getExpiringItems(userId: string): Promise<any[]> {
        // Implementation would query database for expiring items
        // Placeholder for demonstration
        return [];
    }
}

export default NotificationService;