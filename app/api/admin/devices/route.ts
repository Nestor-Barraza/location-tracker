import { NextRequest, NextResponse } from 'next/server';
import { userQueries, connectedDevices, deviceCommands } from '../../../../lib/db';

export async function GET() {
  try {
    const dbDevices = await userQueries.getActiveDevices();
    
    const formattedDevices = dbDevices.map(device => ({
      device_id: device.device_id,
      username: device.username,
      user_agent: device.user_agent,
      registered_at: new Date(device.created_at).getTime(),
      last_seen: new Date(device.last_seen).getTime(),
      is_tracking: device.tracking_enabled,
      is_connected: connectedDevices.has(device.device_id) 
    }));
    

    
    return NextResponse.json({ devices: formattedDevices });
  } catch (error) {
    console.error('Error fetching devices:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

interface BroadcastRequest {
  action: string;
  interval?: number;
}

export async function POST(request: NextRequest) {
  try {
    const { action, interval }: BroadcastRequest = await request.json();
    
    if (action === 'cleanup_devices') {
      const deviceCount = connectedDevices.size;
      connectedDevices.clear();
      deviceCommands.clear();
      console.log(`Cleared ${deviceCount} phantom devices from memory`);
      return NextResponse.json({ success: true, cleared_devices: deviceCount });
    }
    
    let commandsSent = 0;
    
    connectedDevices.forEach((device, deviceId) => {
      const commandId = `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const command = {
        id: commandId,
        type: action,
        payload: interval ? { interval } : undefined,
        timestamp: Date.now()
      };
      
      if (!deviceCommands.has(deviceId)) {
        deviceCommands.set(deviceId, []);
      }
      deviceCommands.get(deviceId)?.push(command);
      
      if (action === 'start_tracking') {
        (device as Record<string, unknown>).is_tracking = true;
      } else if (action === 'stop_tracking') {
        (device as Record<string, unknown>).is_tracking = false;
      }
      
      commandsSent++;
    });
    
    console.log(`Broadcast command sent to ${commandsSent} devices: ${action}`);
    
    return NextResponse.json({ success: true, devices_count: commandsSent });
  } catch (error) {
    console.error('Error broadcasting command:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}