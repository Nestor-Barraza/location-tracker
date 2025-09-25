import { NextRequest, NextResponse } from 'next/server';

const { database } = require('../../../../../lib/postgres');

interface BroadcastRequest {
  action: string;
  interval?: number;
}

export async function POST(request: NextRequest) {
  try {
    const { action, interval }: BroadcastRequest = await request.json();

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    const client = await database.pool.connect();
    try {
      const activeDevices = await client.query(
        'SELECT device_id FROM devices WHERE is_active = true'
      );

      if (activeDevices.rows.length === 0) {
        return NextResponse.json({
          success: true,
          devices_count: 0,
          message: 'No active devices to send commands to'
        });
      }

      const commandData: Record<string, unknown> = {};
      if (interval) {
        commandData.interval = interval;
      }

      const insertPromises = activeDevices.rows.map(async (device: { device_id: string }) => {
        await client.query(
          'INSERT INTO device_commands (device_id, command_type, command_data) VALUES ($1, $2, $3)',
          [device.device_id, action, JSON.stringify(commandData)]
        );
      });

      await Promise.all(insertPromises);

      return NextResponse.json({
        success: true,
        devices_count: activeDevices.rows.length,
        message: `Command "${action}" sent to ${activeDevices.rows.length} devices`
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error broadcasting command:', error);
    return NextResponse.json(
      { error: 'Error broadcasting command' },
      { status: 500 }
    );
  }
}