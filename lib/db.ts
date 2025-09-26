import { locationQueries, userQueries } from './postgres.mjs';

interface EventClient {
  write: (data: string) => void;
  on: (event: string, callback: () => void) => void;
}

interface DeviceCommand {
  id: string;
  type: string;
  payload?: Record<string, unknown>;
  timestamp: number;
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
const deviceCommands = new Map<string, DeviceCommand[]>();
const connectedDevices = new Map<string, Record<string, unknown>>();

export {
  locationQueries,
  userQueries,
  eventEmitter,
  deviceCommands,
  connectedDevices,
  type DeviceCommand
};