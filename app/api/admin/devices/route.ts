import { NextRequest, NextResponse } from 'next/server';

const { database } = require('../../../../lib/postgres');

interface DeviceInfo {
  device_id: string;
  username: string;
  device_name: string;
  user_agent: string;
  is_active: boolean;
  last_seen: string;
  created_at: string;
}

export async function GET(request: NextRequest) {
  try {
    const client = await database.pool.connect();
    try {
      const devices = await client.query(
        `SELECT 
          d.device_id,
          u.username,
          d.device_name,
          d.user_agent,
          d.is_active,
          d.last_seen,
          d.created_at
        FROM devices d
        JOIN users u ON d.user_id = u.id
        WHERE d.is_active = true
        ORDER BY d.last_seen DESC`
      );

      const formattedDevices = devices.rows.map((device: DeviceInfo) => ({
        device_id: device.device_id,
        username: device.username,
        device_name: device.device_name || 'Unnamed Device',
        user_agent: device.user_agent,
        is_tracking: false,
        last_seen: new Date(device.last_seen).getTime(),
        registered_at: new Date(device.created_at).getTime()
      }));

      return NextResponse.json({
        devices: formattedDevices
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching devices:', error);
    return NextResponse.json(
      { error: 'Error fetching devices' },
      { status: 500 }
    );
  }
}