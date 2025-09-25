require('dotenv').config({ path: '.env.local' });
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const cors = require('cors');
const express = require('express');
const { locationQueries, userQueries, eventEmitter } = require('./lib/postgres');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || (dev ? 'localhost' : '0.0.0.0');
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const apiApp = express();
apiApp.use(cors());
apiApp.use(express.json());

const deviceCommands = new Map();
const connectedDevices = new Map();

apiApp.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

apiApp.use('/api/admin/device', (req, res, next) => {
  console.log(`Admin device route - ${req.method} ${req.url}`);
  next();
});

apiApp.post('/api/location', async (req, res) => {
  try {
    const { user_id, username, latitude, longitude, accuracy } = req.body;
    
    if (!user_id || !username || !latitude || !longitude) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const timestamp = Date.now();
    
    await locationQueries.insertLocation(
      user_id, username, latitude, longitude, accuracy || null, timestamp
    );
    
    await userQueries.upsertActiveUser(user_id, username, 'user', timestamp);
    
    eventEmitter.broadcast('location-update', {
      user_id,
      username,
      latitude,
      longitude,
      accuracy,
      timestamp
    });
    
    console.log(`Location updated for ${username}: ${latitude}, ${longitude}`);
    
    res.json({ success: true, timestamp });
    
  } catch (error) {
    console.error('Error saving location:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

apiApp.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const userData = await userQueries.getUserByCredentials(username, password);
    
    if (userData) {
      const userInfo = {
        id: userData.id,
        username: userData.username,
        role: userData.role,
      };
      
      await userQueries.upsertActiveUser(userData.id, userData.username, userData.role, Date.now());
      
      console.log(`User ${username} logged in successfully (${userData.role})`);
      
      res.json({ success: true, user: userInfo });
    } else {
      res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

apiApp.post('/api/mobile/logout', (req, res) => {
  try {
    const { device_id } = req.body;
    
    console.log(`Mobile logout request for device: ${device_id}`);
    
    res.json({ 
      success: true, 
      message: 'Logout successful', 
      note: 'Location tracking continues for security purposes' 
    });
    
  } catch (error) {
    console.error('Error during mobile logout:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

apiApp.get('/api/locations', async (req, res) => {
  try {
    const { timeframe = '24h' } = req.query;
    
    let minTimestamp;
    switch (timeframe) {
      case '1h': minTimestamp = Date.now() - (60 * 60 * 1000); break;
      case '6h': minTimestamp = Date.now() - (6 * 60 * 60 * 1000); break;
      case '24h': minTimestamp = Date.now() - (24 * 60 * 60 * 1000); break;
      case '7d': minTimestamp = Date.now() - (7 * 24 * 60 * 60 * 1000); break;
      default: minTimestamp = Date.now() - (24 * 60 * 60 * 1000);
    }
    
    const locations = await locationQueries.getLatestUserLocations(minTimestamp);
    
    res.json({ locations });
    
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

apiApp.get('/api/active-users', async (req, res) => {
  try {
    const minTimestamp = Date.now() - (30 * 60 * 1000);
    const activeUsers = await userQueries.getActiveUsers(minTimestamp);
    
    res.json({ users: activeUsers });
    
  } catch (error) {
    console.error('Error fetching active users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

apiApp.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });
  
  res.write(`data: {"type": "connected", "timestamp": ${Date.now()}}\n\n`);
  
  eventEmitter.addClient(res);
  
  console.log(`SSE client connected. Total clients: ${eventEmitter.getClientCount()}`);
  
  const heartbeat = setInterval(() => {
    try {
      res.write(`event: heartbeat\ndata: {"timestamp": ${Date.now()}}\n\n`);
    } catch (error) {
      clearInterval(heartbeat);
    }
  }, 30000);
  
  res.on('close', () => {
    clearInterval(heartbeat);
    console.log(`SSE client disconnected. Total clients: ${eventEmitter.getClientCount()}`);
  });
});


apiApp.post('/api/device/register', async (req, res) => {
  try {
    const { device_id, username, user_agent } = req.body;
    
    if (!device_id || !username) {
      return res.status(400).json({ error: 'Missing device_id or username' });
    }

    
    const user = await userQueries.getUserByUsername(username);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    
    await userQueries.registerDevice(device_id, user.id, user_agent);

    
    connectedDevices.set(device_id, {
      device_id,
      username,
      user_agent,
      registered_at: Date.now(),
      last_seen: Date.now(),
      is_tracking: true
    });
    
    console.log(`Device registered in DB: ${device_id} (${username})`);
    
    eventEmitter.broadcast('device-registered', {
      device_id,
      username,
      timestamp: Date.now()
    });
    
    res.json({ success: true, device_id });
    
  } catch (error) {
    console.error('Error registering device:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

apiApp.get('/api/device/:deviceId/status', async (req, res) => {
  try {
    const { deviceId } = req.params;

    
    const devices = await userQueries.getActiveDevices();
    const device = devices.find(d => d.device_id === deviceId);
    
    if (device) {
      res.json({ 
        exists: true, 
        device_id: device.device_id,
        username: device.username,
        last_seen: device.last_seen
      });
    } else {
      res.status(404).json({ exists: false });
    }
  } catch (error) {
    console.error('Error checking device status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

apiApp.get('/api/device/:deviceId/commands', async (req, res) => {
  try {
    const { deviceId } = req.params;

    
    await userQueries.updateDeviceLastSeen(deviceId);

    
    if (connectedDevices.has(deviceId)) {
      const device = connectedDevices.get(deviceId);
      device.last_seen = Date.now();
    }
    
    const commands = deviceCommands.get(deviceId) || [];
    
    res.json({ commands });
    
  } catch (error) {
    console.error('Error fetching commands:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

apiApp.post('/api/device/command/:commandId/ack', (req, res) => {
  try {
    const { commandId } = req.params;
    const { device_id } = req.body;
    
    if (deviceCommands.has(device_id)) {
      const commands = deviceCommands.get(device_id);
      const index = commands.findIndex(cmd => cmd.id === commandId);
      if (index !== -1) {
        commands.splice(index, 1);
        console.log(`Command ${commandId} acknowledged by ${device_id}`);
      }
    }
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Error acknowledging command:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


apiApp.delete('/api/admin/test', (req, res) => {
  console.log('DELETE test endpoint called');
  res.json({ success: true, message: 'DELETE method works' });
});

apiApp.get('/api/admin/devices', async (req, res) => {
  try {
    const devices = await userQueries.getActiveDevices();
    
    const formattedDevices = devices.map(device => ({
      device_id: device.device_id,
      username: device.username,
      user_agent: device.user_agent,
      registered_at: new Date(device.created_at).getTime(),
      last_seen: new Date(device.last_seen).getTime(),
      is_tracking: device.tracking_enabled
    }));
    
    res.json({ devices: formattedDevices });
    
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

apiApp.delete('/api/admin/device/:deviceId', (req, res) => {
  try {
    const { deviceId } = req.params;
    
    console.log(`Admin requesting to delete device: ${deviceId}`);
    console.log('Available devices:', Array.from(connectedDevices.keys()));
    
    if (!connectedDevices.has(deviceId)) {
      console.log(`Device ${deviceId} not found in connected devices`);
      return res.status(404).json({ error: 'Device not found', deviceId, availableDevices: Array.from(connectedDevices.keys()) });
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
    
    res.json({ success: true, message: 'Device removed successfully' });
    
  } catch (error) {
    console.error('Error removing device:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

apiApp.post('/api/admin/device/:deviceId/command', (req, res) => {
  try {
    const { deviceId } = req.params;
    const { action, interval } = req.body;
    
    if (!connectedDevices.has(deviceId)) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    const commandId = `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const command = {
      id: commandId,
      action,
      interval,
      created_at: Date.now(),
      processed: false
    };
    
    if (!deviceCommands.has(deviceId)) {
      deviceCommands.set(deviceId, []);
    }
    deviceCommands.get(deviceId).push(command);
    
    const device = connectedDevices.get(deviceId);
    if (action === 'start_tracking') {
      device.is_tracking = true;
    } else if (action === 'stop_tracking') {
      device.is_tracking = false;
    }
    
    console.log(`Command sent to ${deviceId}: ${action}`);
    
    res.json({ success: true, command_id: commandId });
    
  } catch (error) {
    console.error('Error sending command:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

apiApp.post('/api/admin/devices/broadcast', (req, res) => {
  try {
    const { action, interval } = req.body;
    
    let commandsSent = 0;
    
    for (const [deviceId, device] of connectedDevices) {
      const commandId = `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const command = {
        id: commandId,
        action,
        interval,
        created_at: Date.now(),
        processed: false
      };
      
      if (!deviceCommands.has(deviceId)) {
        deviceCommands.set(deviceId, []);
      }
      deviceCommands.get(deviceId).push(command);
      
      if (action === 'start_tracking') {
        device.is_tracking = true;
      } else if (action === 'stop_tracking') {
        device.is_tracking = false;
      }
      
      commandsSent++;
    }
    
    console.log(`Broadcast command sent to ${commandsSent} devices: ${action}`);
    
    res.json({ success: true, devices_count: commandsSent });
    
  } catch (error) {
    console.error('Error broadcasting command:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

apiApp.post('/api/admin/users', async (req, res) => {
  try {
    const { username, password, role = 'user' } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    if (username.length < 3 || password.length < 4) {
      return res.status(400).json({ error: 'Username must be at least 3 characters and password at least 4 characters' });
    }
    
    const existingUser = await userQueries.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    const userId = await userQueries.createUser(username, password, role);
    
    console.log(`Admin created new user: ${username} (${role}) with ID: ${userId}`);
    
    res.json({ 
      success: true, 
      user: { 
        id: userId, 
        username, 
        role 
      } 
    });
    
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

apiApp.get('/api/admin/users', async (req, res) => {
  try {
    const users = await userQueries.getAllUsers();
    
    res.json({ users });
    
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

apiApp.patch('/api/admin/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { tracking_enabled } = req.body;
    
    if (typeof tracking_enabled !== 'boolean') {
      return res.status(400).json({ error: 'tracking_enabled must be a boolean' });
    }
    
    const updated = await userQueries.updateUserTracking(userId, tracking_enabled);
    
    if (updated) {
      console.log(`Admin updated tracking for user ID: ${userId} to ${tracking_enabled}`);
      res.json({ success: true, message: 'User tracking updated successfully' });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
    
  } catch (error) {
    console.error('Error updating user tracking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

apiApp.get('/api/user/tracking-status', async (req, res) => {
  try {
    const { username } = req.query;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    const user = await userQueries.getUserByUsername(username);
    
    if (!user) {
      const userId = await userQueries.createUser(username, 'default', 'mobile_user');
      console.log(`Created new mobile user: ${username} with ID: ${userId}`);
      
      return res.json({
        tracking_enabled: true,
        user_created: true
      });
    }

    
    const userDetails = await userQueries.getUserDetails(username);
    
    return res.json({
      tracking_enabled: userDetails?.tracking_enabled || false,
      user_created: false
    });
    
  } catch (error) {
    console.error('Error checking tracking status:', error);
    res.status(500).json({ error: 'Error al verificar estado de tracking' });
  }
});

apiApp.delete('/api/admin/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const deleted = await userQueries.deleteUser(userId);
    
    if (deleted) {
      console.log(`Admin deleted user with ID: ${userId}`);
      res.json({ success: true, message: 'User deleted successfully' });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
    
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      
      if (parsedUrl.pathname.startsWith('/api/')) {
        return apiApp(req, res);
      }
      
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log('> HTTP API + SSE server running');
    console.log('> Location tracking ready for 24/7 operation');
  });
});