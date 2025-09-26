import { NextRequest, NextResponse } from 'next/server';
import { userQueries } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

interface ResetPasswordRequest {
  targetUserId: number;
  newPassword: string;
}

export async function POST(request: NextRequest) {
  try {
    const { targetUserId, newPassword }: ResetPasswordRequest = await request.json();

    if (!targetUserId || !newPassword) {
      return NextResponse.json(
        { error: 'Target user ID and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'La nueva contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    const result = await userQueries.adminResetUserPassword(targetUserId, newPassword);

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
    console.error('Error resetting password:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}