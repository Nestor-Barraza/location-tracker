import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcrypt';

const { database } = require('../../../lib/postgres');

interface LoginRequest {
  username: string;
  password: string;
}

interface User {
  id: number;
  username: string;
  role: string;
  tracking_enabled: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const { username, password }: LoginRequest = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const client = await database.pool.connect();
    try {
      const result = await client.query(
        'SELECT id, username, password, role, tracking_enabled FROM users WHERE username = $1',
        [username]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        );
      }

      const user: User & { password: string } = result.rows[0];
      const isValidPassword = await compare(password, user.password);

      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        );
      }

      const userResponse = {
        id: user.id.toString(),
        username: user.username,
        role: user.role
      };

      return NextResponse.json({
        success: true,
        user: userResponse
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}