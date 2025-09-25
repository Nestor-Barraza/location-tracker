import { NextRequest, NextResponse } from 'next/server';
import { userQueries, eventEmitter, connectedDevices } from '../../../../lib/db';

interface RegisterDeviceRequest {
  device_id: string;
  username: string;
  user_agent?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { device_id, username, user_agent }: RegisterDeviceRequest = await request.json();

    if (!device_id || !username) {
      return NextResponse.json(
        { error: 'Missing device_id or username' },
        { status: 400 }
      );
    }
    
    const user = await userQueries.getUserByUsername(username);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    await userQueries.registerDevice(device_id, user.id, user_agent);
    
    connectedDevices.set(device_id, {
      device_id,
      username,
      user_agent,
      registered_at: Date.now(),
      last_seen: Date.now(),
      is_tracking: true
    });
    
    console.log(`Device registered in DB: ${device_id} (${username})`);
    
    eventEmitter.broadcast('device-registered', {
      device_id,
      username,
      timestamp: Date.now()
    });

    return NextResponse.json({ success: true, device_id });
  } catch (error) {
    console.error('Error registering device:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}