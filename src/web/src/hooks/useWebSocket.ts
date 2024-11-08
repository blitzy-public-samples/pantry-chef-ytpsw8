// External dependencies
import { useState, useEffect, useCallback } from 'react'; // react ^18.0.0

// Internal dependencies
import { WebSocketService } from '../services/websocket.service';
import { WEBSOCKET_CONFIG } from '../config/constants';
import { EventListenerFunction } from '../interfaces/auth.interface';

/**
 * HUMAN TASKS:
 * 1. Configure WebSocket server URL in .env file (NEXT_PUBLIC_WEBSOCKET_URL)
 * 2. Set up monitoring for WebSocket connection health in production
 * 3. Configure SSL certificates for secure WebSocket connections
 */

/**
 * Custom React hook for managing WebSocket connections and real-time updates.
 * Implements Socket.io client with automatic reconnection capabilities.
 * 
 * Requirements addressed:
 * - Real-time Communication (5. SYSTEM ARCHITECTURE/5.1 High-Level Architecture Overview)
 * - Live Updates (5.2 Component Architecture/5.2.1 Client Applications)
 * 
 * @param token - Authentication token for WebSocket connection
 * @returns Object containing connection state and WebSocket methods
 */
export const useWebSocket = (token: string) => {
  // Track WebSocket connection state
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Initialize WebSocket service instance
  const webSocketService = new WebSocketService();

  /**
   * Memoized subscribe method to prevent unnecessary re-renders
   */
  const subscribe = useCallback((event: string, callback: EventListenerFunction) => {
    try {
      webSocketService.subscribe(event, callback);
    } catch (error) {
      console.error('Failed to subscribe to WebSocket event:', error);
      throw error;
    }
  }, []);

  /**
   * Memoized unsubscribe method to prevent unnecessary re-renders
   */
  const unsubscribe = useCallback((event: string, callback: EventListenerFunction) => {
    try {
      webSocketService.unsubscribe(event, callback);
    } catch (error) {
      console.error('Failed to unsubscribe from WebSocket event:', error);
    }
  }, []);

  /**
   * Memoized emit method to prevent unnecessary re-renders
   */
  const emit = useCallback((event: string, data: any) => {
    try {
      webSocketService.emit(event, data);
    } catch (error) {
      console.error('Failed to emit WebSocket event:', error);
      throw error;
    }
  }, []);

  /**
   * Set up WebSocket connection and cleanup on mount/unmount
   */
  useEffect(() => {
    let reconnectTimer: NodeJS.Timeout;
    let reconnectAttempts = 0;

    const connectWebSocket = async () => {
      try {
        await webSocketService.connect(token);
        setIsConnected(true);
        reconnectAttempts = 0;
      } catch (error) {
        console.error('WebSocket connection failed:', error);
        setIsConnected(false);

        // Implement automatic reconnection with backoff
        if (reconnectAttempts < WEBSOCKET_CONFIG.RECONNECT_ATTEMPTS) {
          reconnectTimer = setTimeout(connectWebSocket, WEBSOCKET_CONFIG.RECONNECT_INTERVAL);
          reconnectAttempts++;
        }
      }
    };

    // Establish initial connection
    if (token) {
      connectWebSocket();
    }

    // Cleanup function
    return () => {
      clearTimeout(reconnectTimer);
      webSocketService.disconnect();
      setIsConnected(false);
    };
  }, [token]);

  // Return connection state and memoized WebSocket methods
  return {
    isConnected,
    subscribe,
    unsubscribe,
    emit
  };
};

export default useWebSocket;