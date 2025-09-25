import { NextRequest, NextResponse } from 'next/server';

const { database } = require('../../../../../lib/postgres');

interface DeviceCommand {
  id: number;
  command_type: string;
  command_data: Record<string, unknown>;
  created_at: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { deviceId: string } }
) {
  try {
    const deviceId = params.deviceId;

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Device ID is required' },
        { status: 400 }
      );
    }

    const client = await database.pool.connect();
    try {
      const deviceExists = await client.query(
        'SELECT id FROM devices WHERE device_id = $1 AND is_active = true',
        [deviceId]
      );

      if (deviceExists.rows.length === 0) {
        return NextResponse.json(
          { error: 'Device not found or inactive' },
          { status: 404 }
        );
      }

      const commands = await client.query(
        'SELECT id, command_type as action, command_data, created_at FROM device_commands WHERE device_id = $1 AND status = $2 ORDER BY created_at ASC',
        [deviceId, 'pending']
      );

      const formattedCommands = commands.rows.map((cmd: DeviceCommand) => ({
        id: cmd.id,
        action: cmd.command_type,
        ...cmd.command_data,
        created_at: new Date(cmd.created_at).getTime(),
        processed: false
      }));

      await client.query(
        'UPDATE devices SET last_seen = CURRENT_TIMESTAMP WHERE device_id = $1',
        [deviceId]
      );

      return NextResponse.json({
        commands: formattedCommands
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching device commands:', error);
    return NextResponse.json(
      { error: 'Error fetching commands' },
      { status: 500 }
    );
  }
}