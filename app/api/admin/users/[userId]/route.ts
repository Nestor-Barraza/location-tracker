import { NextRequest, NextResponse } from 'next/server';
import { userQueries } from '../../../../../lib/db';

interface RouteParams {
  params: {
    userId: string;
  };
}

interface UpdateUserRequest {
  tracking_enabled: boolean;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = params;
    const { tracking_enabled }: UpdateUserRequest = await request.json();
    
    if (typeof tracking_enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'tracking_enabled must be a boolean' },
        { status: 400 }
      );
    }
    
    const updated = await userQueries.updateUserTracking(parseInt(userId), tracking_enabled);
    
    if (updated) {
      console.log(`Admin updated tracking for user ID: ${userId} to ${tracking_enabled}`);
      return NextResponse.json({ success: true, message: 'User tracking updated successfully' });
    } else {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error updating user tracking:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = params;
    
    const deleted = await userQueries.deleteUser(parseInt(userId));
    
    if (deleted) {
      console.log(`Admin deleted user with ID: ${userId}`);
      return NextResponse.json({ success: true, message: 'User deleted successfully' });
    } else {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}