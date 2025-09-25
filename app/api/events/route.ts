import { NextRequest } from 'next/server';
import { eventEmitter } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const customReadable = new ReadableStream({
    start(controller) {
      const headers = {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      };

      const responseInit = JSON.stringify({ type: 'connected', timestamp: Date.now() });
      controller.enqueue(encoder.encode(`data: ${responseInit}\n\n`));

      const mockClient = {
        write: (data: string) => {
          if (!request.signal.aborted) {
            try {
              controller.enqueue(encoder.encode(data));
            } catch (error) {
              console.error('Error writing to SSE client:', error);
            }
          }
        },
        on: (event: string, callback: () => void) => {
          if (event === 'close') {
            const checkClosed = () => {
              if (request.signal.aborted) {
                eventEmitter.removeClient(mockClient);
                callback();
              } else {
                setTimeout(checkClosed, 1000);
              }
            };
            checkClosed();
          }
        }
      };

      eventEmitter.addClient(mockClient);

      console.log(`SSE client connected. Total clients: ${eventEmitter.getClientCount()}`);

      const heartbeat = setInterval(() => {
        if (request.signal.aborted) {
          clearInterval(heartbeat);
          eventEmitter.removeClient(mockClient);
          return;
        }
        try {
          const heartbeatData = `event: heartbeat\ndata: {"timestamp": ${Date.now()}}\n\n`;
          controller.enqueue(encoder.encode(heartbeatData));
        } catch (error) {
          clearInterval(heartbeat);
          eventEmitter.removeClient(mockClient);
          controller.close();
        }
      }, 30000);

      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        eventEmitter.removeClient(mockClient);
        console.log(`SSE client disconnected. Total clients: ${eventEmitter.getClientCount()}`);
        try {
          controller.close();
        } catch (error) {
          console.error('Error closing controller:', error);
        }
      });
    }
  });

  return new Response(customReadable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
}