import { NextRequest, NextResponse } from 'next/server';

const { database } = require('../../../../lib/postgres');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    const client = await database.pool.connect();
    try {
      const result = await client.query(
        'SELECT tracking_enabled FROM users WHERE username = $1',
        [username]
      );
      
      if (result.rows.length === 0) {
        const maxIdResult = await client.query('SELECT MAX(id) FROM users');
        const nextId = (maxIdResult.rows[0].max || 0) + 1;
        
        const insertResult = await client.query(
          'INSERT INTO users (id, username, role, tracking_enabled) VALUES ($1, $2, $3, $4) RETURNING tracking_enabled',
          [nextId, username, 'mobile_user', false]
        );
        
        return NextResponse.json({ 
          tracking_enabled: insertResult.rows[0].tracking_enabled,
          user_created: true
        });
      }

      return NextResponse.json({ 
        tracking_enabled: result.rows[0].tracking_enabled,
        user_created: false
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching tracking status:', error);
    return NextResponse.json(
      { error: 'Error al verificar estado de tracking' },
      { status: 500 }
    );
  }
}