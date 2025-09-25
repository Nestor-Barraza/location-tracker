import { NextRequest, NextResponse } from 'next/server';
import { locationQueries } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const timeframe = request.nextUrl.searchParams.get('timeframe') || '24h';
    
    let minTimestamp: number;
    switch (timeframe) {
      case '1h': 
        minTimestamp = Date.now() - (60 * 60 * 1000); 
        break;
      case '6h': 
        minTimestamp = Date.now() - (6 * 60 * 60 * 1000); 
        break;
      case '24h': 
        minTimestamp = Date.now() - (24 * 60 * 60 * 1000); 
        break;
      case '7d': 
        minTimestamp = Date.now() - (7 * 24 * 60 * 60 * 1000); 
        break;
      default: 
        minTimestamp = Date.now() - (24 * 60 * 60 * 1000);
    }
    
    const locations = await locationQueries.getLatestUserLocations(minTimestamp);
    
    return NextResponse.json({ locations });
  } catch (error) {
    console.error('Error fetching locations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}