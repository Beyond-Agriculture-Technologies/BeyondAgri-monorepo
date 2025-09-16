import * as SQLite from 'expo-sqlite'
import { Farm, Photo, OfflineAction } from '../types'

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null

  async init() {
    try {
      this.db = await SQLite.openDatabaseAsync('beyondagri.db')
      await this.createTables()
      console.log('Database initialized successfully')
    } catch (error) {
      console.error('Database initialization error:', error)
    }
  }

  private async createTables() {
    if (!this.db) return

    // Farms table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS farms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        location TEXT NOT NULL,
        latitude REAL,
        longitude REAL,
        area REAL NOT NULL,
        ownerId TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        syncStatus TEXT DEFAULT 'pending'
      );
    `)

    // Photos table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS photos (
        id TEXT PRIMARY KEY,
        farmId TEXT NOT NULL,
        uri TEXT NOT NULL,
        description TEXT,
        timestamp TEXT NOT NULL,
        syncStatus TEXT DEFAULT 'pending',
        FOREIGN KEY (farmId) REFERENCES farms (id) ON DELETE CASCADE
      );
    `)

    // Offline actions table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS offline_actions (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        payload TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        retryCount INTEGER DEFAULT 0
      );
    `)

    // Settings table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `)
  }

  // Farms CRUD operations
  async getFarms(): Promise<Farm[]> {
    if (!this.db) return []

    try {
      const result = await this.db.getAllAsync(
        'SELECT * FROM farms ORDER BY updatedAt DESC'
      )
      return result.map(this.mapRowToFarm)
    } catch (error) {
      console.error('Error fetching farms:', error)
      return []
    }
  }

  async getFarm(id: string): Promise<Farm | null> {
    if (!this.db) return null

    try {
      const result = await this.db.getFirstAsync(
        'SELECT * FROM farms WHERE id = ?',
        [id]
      )
      return result ? this.mapRowToFarm(result) : null
    } catch (error) {
      console.error('Error fetching farm:', error)
      return null
    }
  }

  async saveFarm(farm: Farm): Promise<boolean> {
    if (!this.db) return false

    try {
      await this.db.runAsync(
        `INSERT OR REPLACE INTO farms
         (id, name, location, latitude, longitude, area, ownerId, createdAt, updatedAt, syncStatus)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          farm.id,
          farm.name,
          farm.location,
          farm.coordinates.latitude,
          farm.coordinates.longitude,
          farm.area,
          farm.ownerId,
          farm.createdAt,
          farm.updatedAt,
          farm.syncStatus
        ]
      )
      return true
    } catch (error) {
      console.error('Error saving farm:', error)
      return false
    }
  }

  async deleteFarm(id: string): Promise<boolean> {
    if (!this.db) return false

    try {
      await this.db.runAsync('DELETE FROM farms WHERE id = ?', [id])
      return true
    } catch (error) {
      console.error('Error deleting farm:', error)
      return false
    }
  }

  // Photos CRUD operations
  async getPhotos(farmId?: string): Promise<Photo[]> {
    if (!this.db) return []

    try {
      const query = farmId
        ? 'SELECT * FROM photos WHERE farmId = ? ORDER BY timestamp DESC'
        : 'SELECT * FROM photos ORDER BY timestamp DESC'

      const params = farmId ? [farmId] : []
      const result = await this.db.getAllAsync(query, params)

      return result.map(this.mapRowToPhoto)
    } catch (error) {
      console.error('Error fetching photos:', error)
      return []
    }
  }

  async savePhoto(photo: Photo): Promise<boolean> {
    if (!this.db) return false

    try {
      await this.db.runAsync(
        `INSERT OR REPLACE INTO photos
         (id, farmId, uri, description, timestamp, syncStatus)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          photo.id,
          photo.farmId,
          photo.uri,
          photo.description || null,
          photo.timestamp,
          photo.syncStatus
        ]
      )
      return true
    } catch (error) {
      console.error('Error saving photo:', error)
      return false
    }
  }

  // Offline actions
  async addOfflineAction(action: OfflineAction): Promise<boolean> {
    if (!this.db) return false

    try {
      await this.db.runAsync(
        'INSERT INTO offline_actions (id, type, payload, timestamp, retryCount) VALUES (?, ?, ?, ?, ?)',
        [action.id, action.type, JSON.stringify(action.payload), action.timestamp, action.retryCount]
      )
      return true
    } catch (error) {
      console.error('Error adding offline action:', error)
      return false
    }
  }

  async getOfflineActions(): Promise<OfflineAction[]> {
    if (!this.db) return []

    try {
      const result = await this.db.getAllAsync(
        'SELECT * FROM offline_actions ORDER BY timestamp ASC'
      )
      return result.map(row => ({
        id: row.id as string,
        type: row.type as OfflineAction['type'],
        payload: JSON.parse(row.payload as string),
        timestamp: row.timestamp as string,
        retryCount: row.retryCount as number,
      }))
    } catch (error) {
      console.error('Error fetching offline actions:', error)
      return []
    }
  }

  async removeOfflineAction(id: string): Promise<boolean> {
    if (!this.db) return false

    try {
      await this.db.runAsync('DELETE FROM offline_actions WHERE id = ?', [id])
      return true
    } catch (error) {
      console.error('Error removing offline action:', error)
      return false
    }
  }

  async updateSyncStatus(table: string, id: string, status: 'synced' | 'pending' | 'failed'): Promise<boolean> {
    if (!this.db) return false

    try {
      await this.db.runAsync(
        `UPDATE ${table} SET syncStatus = ? WHERE id = ?`,
        [status, id]
      )
      return true
    } catch (error) {
      console.error('Error updating sync status:', error)
      return false
    }
  }

  // Helper methods
  private mapRowToFarm(row: any): Farm {
    return {
      id: row.id,
      name: row.name,
      location: row.location,
      coordinates: {
        latitude: row.latitude,
        longitude: row.longitude,
      },
      area: row.area,
      ownerId: row.ownerId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      syncStatus: row.syncStatus,
    }
  }

  private mapRowToPhoto(row: any): Photo {
    return {
      id: row.id,
      farmId: row.farmId,
      uri: row.uri,
      description: row.description,
      timestamp: row.timestamp,
      syncStatus: row.syncStatus,
    }
  }

  async clearAllData(): Promise<boolean> {
    if (!this.db) return false

    try {
      await this.db.execAsync(`
        DELETE FROM farms;
        DELETE FROM photos;
        DELETE FROM offline_actions;
      `)
      return true
    } catch (error) {
      console.error('Error clearing data:', error)
      return false
    }
  }
}

export const dbService = new DatabaseService()