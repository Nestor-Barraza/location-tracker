import { NextRequest, NextResponse } from 'next/server';

const { database } = require('../../../../../lib/postgres');

export async function DELETE(
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
        'SELECT id FROM devices WHERE device_id = $1',
        [deviceId]
      );

      if (deviceExists.rows.length === 0) {
        return NextResponse.json(
          { error: 'Device not found' },
          { status: 404 }
        );
      }

      await client.query('BEGIN');

      await client.query(
        'DELETE FROM device_locations WHERE device_id = $1',
        [deviceId]
      );

      await client.query(
        'DELETE FROM device_commands WHERE device_id = $1',
        [deviceId]
      );

      await client.query(
        'DELETE FROM devices WHERE device_id = $1',
        [deviceId]
      );

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Device deleted successfully'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting device:', error);
    return NextResponse.json(
      { error: 'Error deleting device' },
      { status: 500 }
    );
  }
}