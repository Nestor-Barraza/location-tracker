import { Pool } from 'pg';
import bcrypt from 'bcrypt';

class PostgresDatabase {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.NEXT_PUBLIC_DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    this.initDatabase();
  }

  async initDatabase() {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          password VARCHAR(100) NOT NULL,
          role VARCHAR(20) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS tracking_enabled BOOLEAN DEFAULT false;
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS devices (
          id SERIAL PRIMARY KEY,
          device_id VARCHAR(255) UNIQUE NOT NULL,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          device_name VARCHAR(255),
          user_agent TEXT,
          is_active BOOLEAN DEFAULT true,
          last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS device_commands (
          id SERIAL PRIMARY KEY,
          device_id VARCHAR(255) NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
          command_type VARCHAR(50) NOT NULL,
          command_data JSONB,
          status VARCHAR(20) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          executed_at TIMESTAMP
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS device_locations (
          id SERIAL PRIMARY KEY,
          device_id VARCHAR(255) NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
          latitude DECIMAL(10, 8) NOT NULL,
          longitude DECIMAL(11, 8) NOT NULL,
          accuracy DECIMAL(10, 2),
          speed DECIMAL(10, 2),
          heading DECIMAL(10, 2),
          timestamp BIGINT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS locations (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(100) NOT NULL,
          username VARCHAR(50) NOT NULL,
          latitude DECIMAL(10, 8) NOT NULL,
          longitude DECIMAL(11, 8) NOT NULL,
          accuracy DECIMAL(8, 2),
          timestamp BIGINT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS active_users (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(100) UNIQUE NOT NULL,
          username VARCHAR(50) NOT NULL,
          role VARCHAR(20) NOT NULL,
          last_active BIGINT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_devices_device_id ON devices(device_id);
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_device_commands_device_id ON device_commands(device_id);
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_device_commands_status ON device_commands(status);
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_device_locations_device_id ON device_locations(device_id);
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_device_locations_timestamp ON device_locations(timestamp);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_locations_timestamp ON locations(timestamp);
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_locations_user_id ON locations(user_id);
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_active_users_last_active ON active_users(last_active);
      `);

      const adminExists = await client.query(`
        SELECT COUNT(*) FROM users WHERE role = 'admin'
      `);
      
      if (parseInt(adminExists.rows[0].count) === 0) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        await client.query(`
          INSERT INTO users (id, username, password, role, tracking_enabled, created_at)
          VALUES (1, 'admin', $1, 'admin', true, CURRENT_TIMESTAMP)
        `, [hashedPassword]);
        
        console.log('Admin user created: admin/admin123 (password encrypted)');
      } else {
        console.log('Admin user already exists, skipping creation');
      }

      console.log('Database tables verified successfully');
    } catch (error) {
      console.error('Database initialization error:', error);
    } finally {
      client.release();
    }
  }

  async insertLocation(userId, username, latitude, longitude, accuracy, timestamp) {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO locations (user_id, username, latitude, longitude, accuracy, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `;
      const result = await client.query(query, [userId, username, latitude, longitude, accuracy, timestamp]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getLatestUserLocations(minTimestamp) {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT DISTINCT ON (user_id) user_id, username, latitude, longitude, accuracy, timestamp
        FROM locations
        WHERE timestamp > $1
        ORDER BY user_id, timestamp DESC
      `;
      const result = await client.query(query, [minTimestamp]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getAllLocationsInTimeframe(minTimestamp) {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT user_id, username, latitude, longitude, accuracy, timestamp
        FROM locations
        WHERE timestamp > $1
        ORDER BY timestamp DESC
      `;
      const result = await client.query(query, [minTimestamp]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async upsertActiveUser(userId, username, role, lastActive) {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO active_users (user_id, username, role, last_active, updated_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id)
        DO UPDATE SET
          username = EXCLUDED.username,
          role = EXCLUDED.role,
          last_active = EXCLUDED.last_active,
          updated_at = CURRENT_TIMESTAMP
      `;
      await client.query(query, [userId, username, role, lastActive]);
    } finally {
      client.release();
    }
  }

  async getActiveUsers(minTimestamp) {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT user_id, username, role, last_active
        FROM active_users
        WHERE last_active > $1
        ORDER BY last_active DESC
      `;
      const result = await client.query(query, [minTimestamp]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getUserByCredentials(username, password) {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT id, username, role, password
        FROM users
        WHERE username = $1
      `;
      const result = await client.query(query, [username]);
      const user = result.rows[0];
      
      if (user && await bcrypt.compare(password, user.password)) {
        return {
          id: user.id,
          username: user.username,
          role: user.role
        };
      }
      
      return null;
    } finally {
      client.release();
    }
  }

  async getUserByUsername(username) {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT id, username, role
        FROM users
        WHERE username = $1
      `;
      const result = await client.query(query, [username]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async createUser(username, password, role = 'user') {
    const client = await this.pool.connect();
    try {
      const hashedPassword = await bcrypt.hash(password, 10);

      
      const maxIdQuery = 'SELECT MAX(id) FROM users';
      const maxIdResult = await client.query(maxIdQuery);
      const maxId = maxIdResult.rows[0].max || 0;
      const nextId = maxId + 1;

      
      const query = `
        INSERT INTO users (id, username, password, role, created_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        RETURNING id
      `;
      const result = await client.query(query, [nextId, username, hashedPassword, role]);
      return result.rows[0].id;
    } finally {
      client.release();
    }
  }

  async getAllUsers() {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT id, username, role, created_at, tracking_enabled
        FROM users
        ORDER BY created_at DESC
      `;
      const result = await client.query(query);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async updateUserTracking(userId, trackingEnabled) {
    const client = await this.pool.connect();
    try {
      const query = `
        UPDATE users 
        SET tracking_enabled = $2
        WHERE id = $1
      `;
      const result = await client.query(query, [userId, trackingEnabled]);
      return result.rowCount > 0;
    } finally {
      client.release();
    }
  }

  async updateUserPassword(userId, currentPassword, newPassword) {
    const client = await this.pool.connect();
    try {
      const userQuery = `
        SELECT id, password, role
        FROM users
        WHERE id = $1
      `;
      const userResult = await client.query(userQuery, [userId]);
      const user = userResult.rows[0];
      
      if (!user) {
        return { success: false, error: 'Usuario no encontrado' };
      }
      
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      
      if (!isCurrentPasswordValid) {
        return { success: false, error: 'Contraseña actual incorrecta' };
      }
      
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      
      const updateQuery = `
        UPDATE users 
        SET password = $2
        WHERE id = $1
      `;
      const result = await client.query(updateQuery, [userId, hashedNewPassword]);
      
      if (result.rowCount > 0) {
        return { success: true, message: 'Contraseña actualizada correctamente' };
      } else {
        return { success: false, error: 'Error al actualizar la contraseña' };
      }
    } finally {
      client.release();
    }
  }

  async adminResetUserPassword(targetUserId, newPassword) {
    const client = await this.pool.connect();
    try {
      const userQuery = `
        SELECT id, username, role
        FROM users
        WHERE id = $1
      `;
      const userResult = await client.query(userQuery, [targetUserId]);
      const user = userResult.rows[0];
      
      if (!user) {
        return { success: false, error: 'Usuario no encontrado' };
      }
      
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      
      const updateQuery = `
        UPDATE users 
        SET password = $2
        WHERE id = $1
      `;
      const result = await client.query(updateQuery, [targetUserId, hashedNewPassword]);
      
      if (result.rowCount > 0) {
        return { success: true, message: `Contraseña de ${user.username} actualizada correctamente` };
      } else {
        return { success: false, error: 'Error al actualizar la contraseña' };
      }
    } finally {
      client.release();
    }
  }

  async getUserDetails(username) {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT id, username, role, tracking_enabled, created_at
        FROM users
        WHERE username = $1
      `;
      const result = await client.query(query, [username]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async registerDevice(deviceId, userId, userAgent) {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO devices (device_id, user_id, user_agent, is_active, last_seen)
        VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP)
        ON CONFLICT (device_id)
        DO UPDATE SET
          user_agent = EXCLUDED.user_agent,
          is_active = true,
          last_seen = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id
      `;
      const result = await client.query(query, [deviceId, userId, userAgent]);
      return result.rows[0].id;
    } finally {
      client.release();
    }
  }

  async getActiveDevices() {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT d.device_id, d.user_agent, d.is_active, d.last_seen, d.created_at,
               u.username, u.tracking_enabled
        FROM devices d
        JOIN users u ON d.user_id = u.id
        WHERE d.is_active = true
        ORDER BY d.last_seen DESC
      `;
      const result = await client.query(query);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async updateDeviceLastSeen(deviceId) {
    const client = await this.pool.connect();
    try {
      const query = `
        UPDATE devices 
        SET last_seen = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE device_id = $1
      `;
      await client.query(query, [deviceId]);
    } finally {
      client.release();
    }
  }

  async deleteUser(userId) {
    const client = await this.pool.connect();
    try {
      const query = `DELETE FROM users WHERE id = $1`;
      const result = await client.query(query, [userId]);
      return result.rowCount > 0;
    } finally {
      client.release();
    }
  }

  async close() {
    await this.pool.end();
  }
}

class EventEmitter {
  constructor() {
    this.clients = new Set();
  }

  addClient(res) {
    this.clients.add(res);
    
    res.on('close', () => {
      this.clients.delete(res);
    });
  }

  broadcast(eventType, data) {
    const message = JSON.stringify({ type: eventType, data, timestamp: Date.now() });
    
    this.clients.forEach(client => {
      try {
        client.write(`data: ${message}\n\n`);
      } catch (error) {
        this.clients.delete(client);
      }
    });
  }

  getClientCount() {
    return this.clients.size;
  }
}

const database = new PostgresDatabase();
const eventEmitter = new EventEmitter();

const locationQueries = {
  insertLocation: database.insertLocation.bind(database),
  getLatestUserLocations: database.getLatestUserLocations.bind(database),
  getAllLocationsInTimeframe: database.getAllLocationsInTimeframe.bind(database)
};

const userQueries = {
  upsertActiveUser: database.upsertActiveUser.bind(database),
  getActiveUsers: database.getActiveUsers.bind(database),
  getUserByCredentials: database.getUserByCredentials.bind(database),
  getUserByUsername: database.getUserByUsername.bind(database),
  getUserDetails: database.getUserDetails.bind(database),
  createUser: database.createUser.bind(database),
  getAllUsers: database.getAllUsers.bind(database),
  updateUserTracking: database.updateUserTracking.bind(database),
  updateUserPassword: database.updateUserPassword.bind(database),
  adminResetUserPassword: database.adminResetUserPassword.bind(database),
  registerDevice: database.registerDevice.bind(database),
  getActiveDevices: database.getActiveDevices.bind(database),
  updateDeviceLastSeen: database.updateDeviceLastSeen.bind(database),
  deleteUser: database.deleteUser.bind(database)
};

export {
  database,
  locationQueries,
  userQueries,
  eventEmitter
};