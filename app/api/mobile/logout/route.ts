import { NextRequest, NextResponse } from 'next/server';

interface LogoutRequest {
  device_id: string;
}

export async function POST(request: NextRequest) {
  try {
    const { device_id }: LogoutRequest = await request.json();
    
    console.log(`Mobile logout request for device: ${device_id}`);
    
    return NextResponse.json({
      success: true,
      message: 'Logout successful',
      note: 'Location tracking continues for security purposes'
    });
  } catch (error) {
    console.error('Error during mobile logout:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}