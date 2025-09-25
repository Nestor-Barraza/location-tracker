import { NextRequest, NextResponse } from 'next/server';

const { database } = require('../../../lib/postgres');

interface LocationData {
  device_id: string;
  username: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  timestamp: number;
}

export async function POST(request: NextRequest) {
  try {
    const locationData: LocationData = await request.json();
    const { device_id, username, latitude, longitude, accuracy, speed, heading, timestamp } = locationData;

    if (!device_id || !username || !latitude || !longitude || !timestamp) {
      return NextResponse.json(
        { error: 'Device ID, username, latitude, longitude, and timestamp are required' },
        { status: 400 }
      );
    }

    const client = await database.pool.connect();
    try {
      const deviceExists = await client.query(
        'SELECT d.id FROM devices d JOIN users u ON d.user_id = u.id WHERE d.device_id = $1 AND u.username = $2 AND d.is_active = true',
        [device_id, username]
      );

      if (deviceExists.rows.length === 0) {
        return NextResponse.json(
          { error: 'Device not found or user mismatch' },
          { status: 404 }
        );
      }

      await client.query(
        'INSERT INTO device_locations (device_id, latitude, longitude, accuracy, speed, heading, timestamp) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [device_id, latitude, longitude, accuracy, speed, heading, timestamp]
      );

      await client.query(
        'UPDATE devices SET last_seen = CURRENT_TIMESTAMP WHERE device_id = $1',
        [device_id]
      );

      return NextResponse.json({
        success: true,
        message: 'Location saved successfully'
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error saving location:', error);
    return NextResponse.json(
      { error: 'Error saving location' },
      { status: 500 }
    );
  }
}