import { NextResponse, NextRequest } from 'next/server';

const { database } = require('../../../../../lib/postgres');

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const client = await database.pool.connect();
    try {
      const userCheck = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
      if (userCheck.rows.length === 0) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      if (userCheck.rows[0].role === 'admin') {
        return NextResponse.json(
          { error: 'No se pueden eliminar usuarios administradores' },
          { status: 403 }
        );
      }

      await client.query('DELETE FROM users WHERE id = $1', [userId]);

      return NextResponse.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;
    const { tracking_enabled } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const client = await database.pool.connect();
    try {
      const userCheck = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
      if (userCheck.rows.length === 0) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      if (userCheck.rows[0].role === 'admin') {
        return NextResponse.json(
          { error: 'No se puede cambiar el tracking de usuarios administradores' },
          { status: 403 }
        );
      }

      const result = await client.query(
        'UPDATE users SET tracking_enabled = $1 WHERE id = $2 RETURNING *',
        [tracking_enabled, userId]
      );

      return NextResponse.json({ 
        success: true,
        user: result.rows[0]
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating user tracking:', error);
    return NextResponse.json({ error: 'Failed to update user tracking' }, { status: 500 });
  }
}