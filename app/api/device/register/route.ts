import { NextRequest, NextResponse } from 'next/server';

const { database } = require('../../../../lib/postgres');

interface RegisterDeviceRequest {
  device_id: string;
  user_id: number;
  device_name?: string;
  user_agent?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { device_id, user_id, device_name, user_agent }: RegisterDeviceRequest = await request.json();

    if (!device_id || !user_id) {
      return NextResponse.json(
        { error: 'Device ID and User ID are required' },
        { status: 400 }
      );
    }

    const client = await database.pool.connect();
    try {
      const userExists = await client.query('SELECT id FROM users WHERE id = $1', [user_id]);
      
      if (userExists.rows.length === 0) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      const existingDevice = await client.query(
        'SELECT id FROM devices WHERE device_id = $1',
        [device_id]
      );

      if (existingDevice.rows.length > 0) {
        await client.query(
          'UPDATE devices SET user_id = $1, device_name = $2, user_agent = $3, last_seen = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE device_id = $4',
          [user_id, device_name, user_agent, device_id]
        );
      } else {
        await client.query(
          'INSERT INTO devices (device_id, user_id, device_name, user_agent) VALUES ($1, $2, $3, $4)',
          [device_id, user_id, device_name, user_agent]
        );
      }

      return NextResponse.json({ 
        success: true,
        message: 'Device registered successfully'
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error registering device:', error);
    return NextResponse.json(
      { error: 'Error registering device' },
      { status: 500 }
    );
  }
}