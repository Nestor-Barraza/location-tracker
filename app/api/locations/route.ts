import { NextRequest, NextResponse } from 'next/server';

const { database } = require('../../../lib/postgres');

interface LocationData {
  device_id: string;
  username: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number;
  heading: number;
  timestamp: number;
  created_at: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '24h';
    
    let timeCondition = '';
    switch (timeframe) {
      case '1h':
        timeCondition = "AND dl.created_at > NOW() - INTERVAL '1 hour'";
        break;
      case '6h':
        timeCondition = "AND dl.created_at > NOW() - INTERVAL '6 hours'";
        break;
      case '24h':
        timeCondition = "AND dl.created_at > NOW() - INTERVAL '24 hours'";
        break;
      case '7d':
        timeCondition = "AND dl.created_at > NOW() - INTERVAL '7 days'";
        break;
      default:
        timeCondition = "AND dl.created_at > NOW() - INTERVAL '24 hours'";
    }

    const client = await database.pool.connect();
    try {
      const result = await client.query(
        `SELECT 
          dl.device_id,
          u.username,
          dl.latitude,
          dl.longitude,
          dl.accuracy,
          dl.speed,
          dl.heading,
          dl.timestamp,
          dl.created_at
        FROM device_locations dl
        JOIN devices d ON dl.device_id = d.device_id
        JOIN users u ON d.user_id = u.id
        WHERE d.is_active = true ${timeCondition}
        ORDER BY dl.timestamp DESC
        LIMIT 1000`
      );

      const locations = result.rows.map((row: LocationData) => ({
        id: row.device_id,
        user_id: row.device_id,
        username: row.username,
        latitude: row.latitude,
        longitude: row.longitude,
        accuracy: row.accuracy,
        speed: row.speed,
        heading: row.heading,
        timestamp: row.timestamp,
        created_at: row.created_at
      }));

      return NextResponse.json({
        locations,
        count: locations.length
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching locations:', error);
    return NextResponse.json(
      { error: 'Error fetching locations' },
      { status: 500 }
    );
  }
}