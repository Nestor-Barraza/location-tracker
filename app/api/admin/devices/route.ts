import { NextResponse } from 'next/server';
import { userQueries } from '../../../../lib/db';

export async function GET() {
  try {
    const dbDevices = await userQueries.getActiveDevices();
    
    const formattedDevices = dbDevices.map(device => ({
      device_id: device.device_id,
      username: device.username,
      user_agent: device.user_agent,
      registered_at: new Date(device.created_at).getTime(),
      last_seen: new Date(device.last_seen).getTime(),
      is_tracking: device.tracking_enabled
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