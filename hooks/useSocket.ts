'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export const useSocket = (serverPath: string) => {
  const socket = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && serverPath && serverPath.trim() !== '') {
      try {
        console.log('Connecting to socket:', serverPath);
        socket.current = io(serverPath);

        socket.current.on('connect', () => {
          console.log('Socket connected');
          setIsConnected(true);
        });

        socket.current.on('disconnect', () => {
          console.log('Socket disconnected');
          setIsConnected(false);
        });

        socket.current.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
        });

        return () => {
          if (socket.current) {
            socket.current.disconnect();
            socket.current = null;
          }
        };
      } catch (error) {
        console.error('Socket initialization error:', error);
      }
    }
  }, [serverPath, isClient]);

  return socket.current;
};