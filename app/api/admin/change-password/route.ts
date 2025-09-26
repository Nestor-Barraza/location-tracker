import { NextRequest, NextResponse } from 'next/server';
import { userQueries } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

interface ChangePasswordRequest {
  userId: number;
  currentPassword: string;
  newPassword: string;
}

export async function POST(request: NextRequest) {
  try {
    const { userId, currentPassword, newPassword }: ChangePasswordRequest = await request.json();

    if (!userId || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'User ID, current password and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'La nueva contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    const result = await userQueries.updateUserPassword(userId, currentPassword, newPassword);

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: result.message 
      });
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error changing password:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}