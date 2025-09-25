import { NextRequest, NextResponse } from 'next/server';
import { userQueries, deviceCommands, connectedDevices } from '../../../../../lib/db';

interface RouteParams {
  params: {
    deviceId: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { deviceId } = params;

    await userQueries.updateDeviceLastSeen(deviceId);
    
    if (connectedDevices.has(deviceId)) {
      const device = connectedDevices.get(deviceId);
      if (device && typeof device === 'object') {
        (device as Record<string, unknown>).last_seen = Date.now();
      }
    }
    
    const commands = deviceCommands.get(deviceId) || [];
    
    return NextResponse.json({ commands });
  } catch (error) {
    console.error('Error fetching device commands:', error);
    return NextResponse.json(
      { error: 'Error fetching commands' },
      { status: 500 }
    );
  }
}