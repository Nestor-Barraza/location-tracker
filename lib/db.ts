import { locationQueries, userQueries } from './postgres';

interface EventClient {
  write: (data: string) => void;
  on: (event: string, callback: () => void) => void;
}

class ServerEventEmitter {
  private clients = new Set<EventClient>();

  addClient(client: EventClient): void {
    this.clients.add(client);
    
    client.on('close', () => {
      this.clients.delete(client);
    });
  }

  removeClient(client: EventClient): void {
    this.clients.delete(client);
  }

  broadcast(eventType: string, data: Record<string, unknown>): void {
    const message = JSON.stringify({ 
      type: eventType, 
      data, 
      timestamp: Date.now() 
    });
    
    this.clients.forEach(client => {
      try {
        client.write(`data: ${message}\n\n`);
      } catch (error) {
        this.clients.delete(client);
      }
    });
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

const eventEmitter = new ServerEventEmitter();

export {
  locationQueries,
  userQueries,
  eventEmitter
};