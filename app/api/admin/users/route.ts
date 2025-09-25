import { NextRequest, NextResponse } from 'next/server';
import { userQueries } from '../../../../lib/db';

export async function GET() {
  try {
    const users = await userQueries.getAllUsers();
    
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

interface CreateUserRequest {
  username: string;
  password: string;
  role?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { username, password, role = 'user' }: CreateUserRequest = await request.json();
    
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }
    
    if (username.length < 3 || password.length < 4) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters and password at least 4 characters' },
        { status: 400 }
      );
    }
    
    const existingUser = await userQueries.getUserByUsername(username);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      );
    }
    
    const userId = await userQueries.createUser(username, password, role);
    
    console.log(`Admin created new user: ${username} (${role}) with ID: ${userId}`);
    
    return NextResponse.json({ 
      success: true, 
      user: { 
        id: userId, 
        username, 
        role 
      } 
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}