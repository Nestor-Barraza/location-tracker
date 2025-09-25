import { NextRequest, NextResponse } from 'next/server';
import { locationQueries, userQueries, eventEmitter } from '../../../lib/db';

interface LocationData {
  user_id: string;
  username: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export async function POST(request: NextRequest) {
  try {
    const locationData: LocationData = await request.json();
    const { user_id, username, latitude, longitude, accuracy } = locationData;

    if (!user_id || !username || !latitude || !longitude) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    
    await locationQueries.insertLocation(
      user_id, username, latitude, longitude, accuracy || null, timestamp
    );
    
    await userQueries.upsertActiveUser(user_id, username, 'user', timestamp);
    
    eventEmitter.broadcast('location-update', {
      user_id,
      username,
      latitude,
      longitude,
      accuracy,
      timestamp
    });
    
    console.log(`Location updated for ${username}: ${latitude}, ${longitude}`);

    return NextResponse.json({ success: true, timestamp });
  } catch (error) {
    console.error('Error saving location:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}