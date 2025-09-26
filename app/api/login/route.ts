import { NextRequest, NextResponse } from 'next/server';
import { userQueries } from '@/lib/postgres';

export const dynamic = 'force-dynamic';

interface LoginRequest {
  username: string;
  password: string;
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

    const userData = await userQueries.getUserByCredentials(username, password);
    
    if (userData) {
      const userInfo = {
        id: userData.id,
        username: userData.username,
        role: userData.role,
      };
      
      await userQueries.upsertActiveUser(userData.id.toString(), userData.username, userData.role, Date.now());
      
      console.log(`User ${username} logged in successfully (${userData.role})`);
      
      return NextResponse.json({ success: true, user: userInfo });
    } else {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}