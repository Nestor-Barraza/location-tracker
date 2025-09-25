import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcrypt';

const { database } = require('../../../../lib/postgres');

export async function GET(request: NextRequest) {
  try {
    const client = await database.pool.connect();
    try {
      const result = await client.query(
        'SELECT id, username, role, created_at, tracking_enabled FROM users ORDER BY created_at DESC'
      );
      
      return NextResponse.json({ users: result.rows });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Error al obtener usuarios' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { username, password, role } = await request.json();
    
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Usuario y contraseña son requeridos' },
        { status: 400 }
      );
    }
    
    const client = await database.pool.connect();
    try {
      const existingUser = await client.query(
        'SELECT id FROM users WHERE username = $1',
        [username]
      );
      
      if (existingUser.rows.length > 0) {
        return NextResponse.json(
          { error: 'El nombre de usuario ya está en uso' },
          { status: 400 }
        );
      }
      
      const hashedPassword = await hash(password, 10);
    const maxIdResult = await client.query('SELECT MAX(id) FROM users');
    const nextId = (maxIdResult.rows[0].max || 0) + 1;
    
    const result = await client.query(
      'INSERT INTO users (id, username, password, role, tracking_enabled) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, role, created_at, tracking_enabled',
      [nextId, username, hashedPassword, role || 'user', false]
    );
      
      return NextResponse.json({ 
        message: 'Usuario creado exitosamente',
        user: result.rows[0]
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Error al crear usuario' },
      { status: 500 }
    );
  }
}