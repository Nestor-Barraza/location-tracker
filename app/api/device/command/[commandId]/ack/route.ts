import { NextRequest, NextResponse } from 'next/server';

const { database } = require('../../../../../../lib/postgres');

interface AcknowledgeRequest {
  device_id: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { commandId: string } }
) {
  try {
    const commandId = params.commandId;
    const { device_id }: AcknowledgeRequest = await request.json();

    if (!commandId || !device_id) {
      return NextResponse.json(
        { error: 'Command ID and Device ID are required' },
        { status: 400 }
      );
    }

    const client = await database.pool.connect();
    try {
      const result = await client.query(
        'UPDATE device_commands SET status = $1, executed_at = CURRENT_TIMESTAMP WHERE id = $2 AND device_id = $3',
        ['executed', commandId, device_id]
      );

      if (result.rowCount === 0) {
        return NextResponse.json(
          { error: 'Command not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Command acknowledged'
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error acknowledging command:', error);
    return NextResponse.json(
      { error: 'Error acknowledging command' },
      { status: 500 }
    );
  }
}