import { NextRequest, NextResponse } from 'next/server';
import { userQueries } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const username = request.nextUrl.searchParams.get('username');
    
    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }
    
    const user = await userQueries.getUserByUsername(username);
    
    if (!user) {
      const userId = await userQueries.createUser(username, 'default', 'mobile_user');
      console.log(`Created new mobile user: ${username} with ID: ${userId}`);
      
      return NextResponse.json({
        tracking_enabled: true,
        user_created: true
      });
    }

    const userDetails = await userQueries.getUserDetails(username);
    
    return NextResponse.json({
      tracking_enabled: userDetails?.tracking_enabled || false,
      user_created: false
    });
  } catch (error) {
    console.error('Error checking tracking status:', error);
    return NextResponse.json(
      { error: 'Error al verificar estado de tracking' },
      { status: 500 }
    );
  }
}