import { NextRequest, NextResponse } from 'next/server';
import { userQueries } from '../../../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const user = await userQueries.getUserByUsername(userId); 
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const locations = await userQueries.getLocationsByUser(userId);
    
    const devices = await userQueries.getDevicesByUser(userId);
    
    const lastLocation = locations.length > 0 ? (() => {
      // Fix timestamp for last location too
      let timestamp = locations[0].timestamp;
      if (timestamp > 2147483647) { // If timestamp is > year 2038 in seconds, it's likely in milliseconds
        timestamp = Math.floor(timestamp / 1000);
      }
      
      let date;
      if (timestamp > 2147483647) { // Still too large, might be microseconds
        date = new Date(timestamp / 1000);
      } else if (timestamp < 1000000000) { // Too small, might be in wrong format
        date = new Date(); // Use current date as fallback
      } else {
        date = new Date(timestamp * 1000);
      }
      
      return {
        latitude: locations[0].latitude,
        longitude: locations[0].longitude,
        timestamp: timestamp,
        accuracy: locations[0].accuracy,
        formatted_time: date.toLocaleString()
      };
    })() : null;

    const formattedLocations = locations.map(location => {
      // Fix timestamp if it's already in milliseconds or invalid
      let timestamp = location.timestamp;
      if (timestamp > 2147483647) { // If timestamp is > year 2038 in seconds, it's likely in milliseconds
        timestamp = Math.floor(timestamp / 1000);
      }
      
      // Create date object - handle both seconds and milliseconds
      let date;
      if (timestamp > 2147483647) { // Still too large, might be microseconds
        date = new Date(timestamp / 1000);
      } else if (timestamp < 1000000000) { // Too small, might be in wrong format
        date = new Date(); // Use current date as fallback
      } else {
        date = new Date(timestamp * 1000);
      }
      
      return {
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: timestamp,
        accuracy: location.accuracy,
        device_id: location.device_id,
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString()
      };
    });

    const formattedDevices = devices.map(device => ({
      device_id: device.device_id,
      user_agent: device.user_agent,
      created_at: new Date(device.created_at).toLocaleString(),
      last_seen: new Date(device.last_seen).toLocaleString(),
      tracking_enabled: device.tracking_enabled
    }));

    const userDetails = {
      user: {
        username: user.username,
        role: user.role,
        tracking_enabled: user.tracking_enabled
      },
      last_location: lastLocation,
      locations: formattedLocations,
      devices: formattedDevices,
      stats: {
        total_locations: locations.length,
        total_devices: devices.length,
        first_seen: locations.length > 0 
          ? (() => {
              let timestamp = locations[locations.length - 1].timestamp;
              if (timestamp > 2147483647) timestamp = Math.floor(timestamp / 1000);
              let date;
              if (timestamp > 2147483647) {
                date = new Date(timestamp / 1000);
              } else if (timestamp < 1000000000) {
                date = new Date();
              } else {
                date = new Date(timestamp * 1000);
              }
              return date.toLocaleString();
            })()
          : null,
        last_seen: lastLocation?.formatted_time || null
      }
    };

    return NextResponse.json(userDetails);
  } catch (error) {
    console.error('Error fetching user details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}