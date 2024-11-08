// External dependencies
import { io, Socket } from 'socket.io-client'; // socket.io-client ^4.5.0
import ReconnectingWebSocket from 'reconnecting-websocket'; // reconnecting-websocket ^4.4.0

// Internal dependencies
import { WEBSOCKET_CONFIG } from '../config/constants';
import { EventListenerFunction } from '../interfaces/auth.interface';

/**
 * HUMAN TASKS:
 * 1. Ensure WebSocket server URL is configured in environment variables
 * 2. Configure SSL certificates for secure WebSocket connections in production
 * 3. Set up monitoring for WebSocket connection health
 */

/**
 * WebSocket service implementation for real-time communication between the web client and backend services.
 * Handles live updates for pantry items, recipe matches, and notifications using Socket.io client.
 * 
 * Requirements addressed:
 * - Real-time Communication (5.2 Component Architecture/5.2.1 Client Applications)
 * - Live Updates (6.2 Sequence Diagrams/6.2.2 Recipe Matching Flow)
 * - Push Notifications (9.1 Authentication and Authorization/9.1.1 Authentication Flow)
 */
export class WebSocketService {
  private socket: Socket | null = null;
  private eventListeners: Map<string, EventListenerFunction[]> = new Map();
  private reconnectAttempts: number = 0;
  private isConnected: boolean = false;

  /**
   * Establishes authenticated WebSocket connection with automatic reconnection support
   * @param token - Authentication token for secure connection
   */
  public async connect(token: string): Promise<void> {
    try {
      // Initialize Socket.io connection with authentication
      this.socket = io(WEBSOCKET_CONFIG.URL, {
        auth: { token },
        reconnection: true,
        reconnectionAttempts: WEBSOCKET_CONFIG.RECONNECT_ATTEMPTS,
        reconnectionDelay: WEBSOCKET_CONFIG.RECONNECT_INTERVAL,
        timeout: 10000
      });

      // Set up connection event handlers
      this.socket.on('connect', () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        console.log('WebSocket connection established');
      });

      this.socket.on('disconnect', (reason) => {
        this.isConnected = false;
        console.log(`WebSocket disconnected: ${reason}`);
      });

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        this.reconnectAttempts++;

        if (this.reconnectAttempts >= WEBSOCKET_CONFIG.RECONNECT_ATTEMPTS) {
          this.socket?.close();
          throw new Error('Maximum reconnection attempts reached');
        }
      });

      // Wait for connection to be established
      await new Promise<void>((resolve, reject) => {
        if (!this.socket) return reject(new Error('Socket not initialized'));

        this.socket.once('connect', () => resolve());
        this.socket.once('connect_error', (error) => reject(error));
      });
    } catch (error) {
      console.error('Failed to establish WebSocket connection:', error);
      throw error;
    }
  }

  /**
   * Safely closes the WebSocket connection and cleans up resources
   */
  public disconnect(): void {
    if (this.socket) {
      // Clean up all event listeners
      this.eventListeners.forEach((callbacks, event) => {
        callbacks.forEach(callback => {
          this.socket?.off(event, callback);
        });
      });

      // Clear internal state
      this.eventListeners.clear();
      this.isConnected = false;
      this.reconnectAttempts = 0;

      // Close socket connection
      this.socket.close();
      this.socket = null;
    }
  }

  /**
   * Subscribes to specific WebSocket events with callback handling
   * @param event - Event name to subscribe to
   * @param callback - Callback function to handle event data
   */
  public subscribe(event: string, callback: EventListenerFunction): void {
    if (!this.socket) {
      throw new Error('WebSocket not connected');
    }

    // Add callback to event listeners map
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)?.push(callback);

    // Set up socket event listener with error handling
    this.socket.on(event, async (...args) => {
      try {
        await callback(...args);
      } catch (error) {
        console.error(`Error in WebSocket event handler for ${event}:`, error);
      }
    });
  }

  /**
   * Unsubscribes from specific WebSocket events and cleans up listeners
   * @param event - Event name to unsubscribe from
   * @param callback - Callback function to remove
   */
  public unsubscribe(event: string, callback: EventListenerFunction): void {
    if (!this.socket) {
      return;
    }

    // Remove callback from event listeners map
    const callbacks = this.eventListeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
        if (callbacks.length === 0) {
          this.eventListeners.delete(event);
          this.socket.off(event);
        }
      }
    }
  }

  /**
   * Emits events to the WebSocket server with error handling
   * @param event - Event name to emit
   * @param data - Data payload to send
   */
  public emit(event: string, data: any): void {
    if (!this.socket || !this.isConnected) {
      throw new Error('WebSocket not connected');
    }

    try {
      this.socket.emit(event, data, (error: any) => {
        if (error) {
          console.error(`Error emitting WebSocket event ${event}:`, error);
          throw error;
        }
      });
    } catch (error) {
      console.error(`Failed to emit WebSocket event ${event}:`, error);
      throw error;
    }
  }
}

export default new WebSocketService();