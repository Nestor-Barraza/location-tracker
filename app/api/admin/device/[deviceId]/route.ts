import { NextRequest, NextResponse } from 'next/server';
import { connectedDevices, deviceCommands, eventEmitter } from '../../../../../lib/db';

interface RouteParams {
  params: {
    deviceId: string;
  };
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { deviceId } = params;
    
    console.log(`Admin requesting to delete device: ${deviceId}`);
    console.log('Available devices:', Array.from(connectedDevices.keys()));
    
    if (!connectedDevices.has(deviceId)) {
      console.log(`Device ${deviceId} not found in connected devices`);
      return NextResponse.json(
        { 
          error: 'Device not found', 
          deviceId, 
          availableDevices: Array.from(connectedDevices.keys()) 
        },
        { status: 404 }
      );
    }
    
    connectedDevices.delete(deviceId);
    
    if (deviceCommands.has(deviceId)) {
      deviceCommands.delete(deviceId);
    }
    
    console.log(`Device ${deviceId} removed by admin`);
    
    eventEmitter.broadcast('device-removed', {
      device_id: deviceId,
      timestamp: Date.now()
    });
    
    return NextResponse.json({ success: true, message: 'Device removed successfully' });
  } catch (error) {
    console.error('Error removing device:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}