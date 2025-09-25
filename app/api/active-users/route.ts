import { NextRequest, NextResponse } from 'next/server';

const { database } = require('../../../lib/postgres');

interface ActiveUser {
  id: string;
  username: string;
  role: string;
  last_seen: string;
  is_active: boolean;
  device_count: number;
}

export async function GET(request: NextRequest) {
  try {
    const client = await database.pool.connect();
    try {
      const result = await client.query(
        `SELECT 
          u.id,
          u.username,
          u.role,
          MAX(d.last_seen) as last_seen,
          COUNT(d.id) as device_count,
          CASE WHEN MAX(d.last_seen) > NOW() - INTERVAL '5 minutes' THEN true ELSE false END as is_active
        FROM users u
        LEFT JOIN devices d ON u.id = d.user_id AND d.is_active = true
        WHERE u.role != 'admin'
        GROUP BY u.id, u.username, u.role
        HAVING COUNT(d.id) > 0
        ORDER BY MAX(d.last_seen) DESC`
      );

      const users = result.rows.map((row: ActiveUser) => ({
        id: row.id,
        username: row.username,
        role: row.role,
        last_seen: new Date(row.last_seen).getTime(),
        is_active: row.is_active,
        device_count: parseInt(row.device_count.toString())
      }));

      return NextResponse.json({
        users,
        count: users.length
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching active users:', error);
    return NextResponse.json(
      { error: 'Error fetching active users' },
      { status: 500 }
    );
  }
}