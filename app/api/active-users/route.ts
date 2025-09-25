import { NextRequest, NextResponse } from 'next/server';
import { userQueries } from '../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    const minTimestamp = Date.now() - (30 * 60 * 1000);
    const activeUsers = await userQueries.getActiveUsers(minTimestamp);
    
    return NextResponse.json({ users: activeUsers });
  } catch (error) {
    console.error('Error fetching active users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}