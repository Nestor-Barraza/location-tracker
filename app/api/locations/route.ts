import { NextRequest, NextResponse } from 'next/server';
import { locationQueries } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const timeframe = request.nextUrl.searchParams.get('timeframe') || '24h';
    const format = request.nextUrl.searchParams.get('format') || 'locations';
    
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
    
    if (format === 'users-with-devices') {
      const usersWithDevicesAndLocations = await locationQueries.getUsersWithLatestDeviceAndLocation(minTimestamp);
      
      const formattedUsers = usersWithDevicesAndLocations.map(user => {
        let timestamp = user.last_location_timestamp;
        let formattedTime = null;
        
        if (timestamp) {
          if (timestamp > 2147483647) {
            timestamp = Math.floor(timestamp / 1000);
          }
          
          let date;
          if (timestamp > 2147483647) {
            date = new Date(timestamp / 1000);
          } else if (timestamp < 1000000000) {
            date = new Date();
          } else {
            date = new Date(timestamp * 1000);
          }
          
          formattedTime = {
            timestamp: timestamp,
            formatted: date.toLocaleString(),
            date: date.toLocaleDateString(),
            time: date.toLocaleTimeString()
          };
        }
        
        return {
          userId: user.username,
          username: user.username,
          role: user.role,
          tracking_enabled: user.tracking_enabled,
          has_location: user.has_location,
          latitude: user.has_location ? Number(user.latitude) : null,
          longitude: user.has_location ? Number(user.longitude) : null,
          accuracy: user.accuracy ? Number(user.accuracy) : null,
          timestamp: user.has_location ? timestamp : null,
          last_location_time: formattedTime,
          latest_device: {
            device_id: user.latest_device_id,
            user_agent: user.latest_device_agent,
            last_seen: user.latest_device_last_seen ? new Date(user.latest_device_last_seen).toLocaleString() : null
          }
        };
      });
      
      return NextResponse.json({ users: formattedUsers });
    } else {
      const locations = await locationQueries.getLatestUserLocations(minTimestamp);
      return NextResponse.json({ locations });
    }
  } catch (error) {
    console.error('Error fetching locations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}