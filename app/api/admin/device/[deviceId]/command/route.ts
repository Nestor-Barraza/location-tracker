import { NextRequest, NextResponse } from 'next/server';
import { connectedDevices, deviceCommands } from '../../../../../../lib/db';

interface RouteParams {
  params: {
    deviceId: string;
  };
}

interface CommandRequest {
  action: string;
  interval?: number;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { deviceId } = params;
    const { action, interval }: CommandRequest = await request.json();
    
    if (!connectedDevices.has(deviceId)) {
      return NextResponse.json(
        { error: 'Device not found' },
        { status: 404 }
      );
    }
    
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
    
    const device = connectedDevices.get(deviceId);
    if (device) {
      if (action === 'start_tracking') {
        (device as Record<string, unknown>).is_tracking = true;
      } else if (action === 'stop_tracking') {
        (device as Record<string, unknown>).is_tracking = false;
      }
    }
    
    console.log(`Command sent to ${deviceId}: ${action}`);
    
    return NextResponse.json({ success: true, command_id: commandId });
  } catch (error) {
    console.error('Error sending command:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}