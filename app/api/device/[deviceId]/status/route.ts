import { NextRequest, NextResponse } from 'next/server';
import { userQueries } from '../../../../../lib/db';

interface RouteParams {
  params: {
    deviceId: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { deviceId } = params;
    
    const devices = await userQueries.getActiveDevices();
    const device = devices.find(d => d.device_id === deviceId);
    
    if (device) {
      return NextResponse.json({ 
        exists: true, 
        device_id: device.device_id,
        username: device.username,
        last_seen: device.last_seen
      });
    } else {
      return NextResponse.json(
        { exists: false },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error checking device status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}