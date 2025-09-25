'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface SSEEvent {
  type: string;
  data: any;
  timestamp: number;
}

interface UseSSEOptions {
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export const useSSE = (url: string, options: UseSSEOptions = {}) => {
  const {
    reconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 10
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reconnectCount, setReconnectCount] = useState(0);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const listenersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (typeof window === 'undefined' || !url) return;

    console.log('Connecting to SSE:', url);
    
    try {
      eventSourceRef.current = new EventSource(url);
      
      eventSourceRef.current.onopen = () => {
        console.log('SSE Connected');
        setIsConnected(true);
        setError(null);
        setReconnectCount(0);
      };
      
      eventSourceRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const sseEvent: SSEEvent = {
            type: 'message',
            data,
            timestamp: Date.now()
          };
          
          setLastEvent(sseEvent);
          
          const listeners = listenersRef.current.get('message');
          if (listeners) {
            listeners.forEach(callback => callback(data));
          }
          
        } catch (err) {
          console.error('Error parsing SSE message:', err);
        }
      };
      
      eventSourceRef.current.addEventListener('location-update', (event) => {
        try {
          const data = JSON.parse(event.data);
          const sseEvent: SSEEvent = {
            type: 'location-update',
            data,
            timestamp: Date.now()
          };
          
          setLastEvent(sseEvent);
          
          const listeners = listenersRef.current.get('location-update');
          if (listeners) {
            listeners.forEach(callback => callback(data));
          }
          
        } catch (err) {
          console.error('Error parsing location-update event:', err);
        }
      });
      
      eventSourceRef.current.addEventListener('heartbeat', (event) => {
        console.log('SSE heartbeat received');
      });
      
      eventSourceRef.current.onerror = (err) => {
        console.error('SSE Error:', err);
        setIsConnected(false);
        setError('Connection error');
        
        if (reconnect && reconnectCount < maxReconnectAttempts) {
          console.log(`Attempting to reconnect... (${reconnectCount + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectCount(prev => prev + 1);
            connect();
          }, reconnectInterval);
        } else if (reconnectCount >= maxReconnectAttempts) {
          setError('Max reconnection attempts reached');
        }
      };
      
    } catch (err) {
      console.error('Error creating EventSource:', err);
      setError('Failed to create connection');
    }
  }, [url, reconnect, reconnectInterval, maxReconnectAttempts, reconnectCount]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setIsConnected(false);
  }, []);

  const addEventListener = useCallback((event: string, callback: (data: any) => void) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    
    listenersRef.current.get(event)!.add(callback);
    
    return () => {
      const listeners = listenersRef.current.get(event);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          listenersRef.current.delete(event);
        }
      }
    };
  }, []);

  useEffect(() => {
    if (url) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [url, connect, disconnect]);

  return {
    isConnected,
    lastEvent,
    error,
    reconnectCount,
    addEventListener,
    disconnect,
    reconnect: connect
  };
};