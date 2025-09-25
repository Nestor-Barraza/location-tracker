import { NextRequest, NextResponse } from 'next/server';
import { deviceCommands, type DeviceCommand } from '../../../../../../lib/db';

interface RouteParams {
  params: {
    commandId: string;
  };
}

interface AckRequest {
  device_id: string;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { commandId } = params;
    const { device_id }: AckRequest = await request.json();
    
    if (deviceCommands.has(device_id)) {
      const commands = deviceCommands.get(device_id);
      if (commands) {
        const index = commands.findIndex((cmd: DeviceCommand) => cmd.id === commandId);
        if (index !== -1) {
          commands.splice(index, 1);
          console.log(`Command ${commandId} acknowledged by ${device_id}`);
        }
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error acknowledging command:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}