import * as SQLite from 'expo-sqlite'
import { Farm, Photo, OfflineAction } from '../types'

/** Row shape returned by SQLite for the farms table */
interface FarmRow {
  id: string
  name: string
  location: string
  latitude: number
  longitude: number
  area: number
  ownerId: string
  createdAt: string
  updatedAt: string
  syncStatus: string
}

/** Row shape returned by SQLite for the photos table */
interface PhotoRow {
  id: string
  farmId: string
  uri: string
  description: string | null
  timestamp: string
  syncStatus: string
}

/** Row shape returned by SQLite for the offline_actions table */
interface OfflineActionRow {
  id: string
  type: string
  payload: string
  timestamp: string
  retryCount: number
}

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null
  private isInitialized: boolean = false
  private initPromise: Promise<void> | null = null
  private initAttempts: number = 0
  private readonly MAX_INIT_ATTEMPTS = 3

  async init(): Promise<void> {
    // Return existing initialization promise if already initializing
    if (this.initPromise) {
      console.log('[DB] Init already in progress, returning existing promise')
      return this.initPromise
    }

    this.initPromise = (async (): Promise<void> => {
      this.initAttempts++
      console.log(`[DB] Initialization attempt ${this.initAttempts}/${this.MAX_INIT_ATTEMPTS}`)

      try {
        console.log('[DB] Opening database connection...')
        this.db = await SQLite.openDatabaseAsync('beyondagri.db')

        if (!this.db) {
          throw new Error('Database connection is null after openDatabaseAsync')
        }

        console.log('[DB] Database opened successfully, connection is valid:', this.db !== null)
        console.log('[DB] Creating tables...')

        await this.createTables()

        console.log('[DB] Tables created successfully')
        console.log('[DB] Validating database health...')

        const isHealthy = await this.healthCheck()
        if (!isHealthy) {
          throw new Error('Database health check failed after initialization')
        }

        this.isInitialized = true
        console.log('[DB] ✅ Database initialized successfully')
      } catch (error) {
        console.error('[DB] ❌ Initialization error:', error)

        // Reset state on failure
        this.db = null
        this.isInitialized = false
        this.initPromise = null

        // Retry if we haven't exceeded max attempts
        if (this.initAttempts < this.MAX_INIT_ATTEMPTS) {
          console.log(`[DB] Retrying initialization in 1 second...`)
          await new Promise(resolve => setTimeout(resolve, 1000))
          return this.init()
        }

        throw error
      }
    })()

    return this.initPromise
  }

  async waitForReady(): Promise<void> {
    if (this.isInitialized && this.db !== null) {
      console.log('[DB] Already initialized and ready')
      return
    }

    console.log('[DB] Waiting for initialization...')
    if (this.initPromise) {
      await this.initPromise
    } else {
      await this.init()
    }

    console.log('[DB] Initialization complete, database ready')
  }

  /**
   * Health check to validate database connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.db) {
        console.error('[DB] Health check failed: database is null')
        return false
      }

      // Try a simple query to verify connection works
      await this.db.getFirstAsync('SELECT 1 as test')
      console.log('[DB] Health check passed')
      return true
    } catch (error) {
      console.error('[DB] Health check failed:', error)
      return false
    }
  }

  /**
   * Validates database connection and re-initializes if necessary
   */
  private async ensureConnection(): Promise<SQLite.SQLiteDatabase> {
    // First check if database exists
    if (!this.db) {
      console.warn('[DB] Database connection is null, re-initializing...')
      await this.init()
    }

    // Double-check after potential re-initialization
    if (!this.db) {
      throw new Error('Failed to establish database connection')
    }

    // Validate connection health
    const isHealthy = await this.healthCheck()
    if (!isHealthy) {
      console.warn('[DB] Database connection unhealthy, re-initializing...')
      this.isInitialized = false
      this.initPromise = null
      await this.init()

      if (!this.db) {
        throw new Error('Failed to re-establish database connection')
      }
    }

    return this.db
  }

  private async createTables() {
    if (!this.db) {
      throw new Error('[DB] Cannot create tables: database connection is null')
    }

    const db = this.db // Store local reference to prevent race condition
    console.log('[DB] Creating tables with connection:', db !== null)

    try {
      // Farms table
      console.log('[DB] Creating farms table...')
      await db.execAsync(`
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
      console.log('[DB] Creating photos table...')
      await db.execAsync(`
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
      console.log('[DB] Creating offline_actions table...')
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS offline_actions (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          payload TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          retryCount INTEGER DEFAULT 0
        );
      `)

      // Settings table
      console.log('[DB] Creating settings table...')
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `)

      console.log('[DB] All tables created successfully')
    } catch (error) {
      console.error('[DB] Error creating tables:', error)
      throw error
    }
  }

  // Farms CRUD operations
  async getFarms(): Promise<Farm[]> {
    await this.waitForReady()
    if (!this.db) return []

    try {
      const result = await this.db.getAllAsync('SELECT * FROM farms ORDER BY updatedAt DESC')
      return result.map(this.mapRowToFarm)
    } catch (error) {
      console.error('Error fetching farms from database:', error)
      return []
    }
  }

  async getFarm(id: string): Promise<Farm | null> {
    await this.waitForReady()
    if (!this.db) return null

    try {
      const result = await this.db.getFirstAsync('SELECT * FROM farms WHERE id = ?', [id])
      return result ? this.mapRowToFarm(result) : null
    } catch (error) {
      console.error('Error fetching farm:', error)
      return null
    }
  }

  async saveFarm(farm: Farm): Promise<boolean> {
    console.log('[DB] saveFarm called for farm:', farm.id)
    await this.waitForReady()

    try {
      const db = await this.ensureConnection()
      console.log('[DB] Executing saveFarm with valid connection')

      await db.runAsync(
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
          farm.syncStatus,
        ]
      )

      console.log('[DB] saveFarm successful for farm:', farm.id)
      return true
    } catch (error) {
      console.error('[DB] Error saving farm:', error)
      return false
    }
  }

  async deleteFarm(id: string): Promise<boolean> {
    console.log('[DB] deleteFarm called for farm:', id)
    await this.waitForReady()

    try {
      const db = await this.ensureConnection()
      console.log('[DB] Executing deleteFarm with valid connection')

      await db.runAsync('DELETE FROM farms WHERE id = ?', [id])

      console.log('[DB] deleteFarm successful for farm:', id)
      return true
    } catch (error) {
      console.error('[DB] Error deleting farm:', error)
      return false
    }
  }

  // Photos CRUD operations
  async getPhotos(farmId?: string): Promise<Photo[]> {
    await this.waitForReady()
    if (!this.db) return []

    try {
      const query = farmId
        ? 'SELECT * FROM photos WHERE farmId = ? ORDER BY timestamp DESC'
        : 'SELECT * FROM photos ORDER BY timestamp DESC'

      const params = farmId ? [farmId] : []
      const result = await this.db.getAllAsync(query, params)

      return result.map(this.mapRowToPhoto)
    } catch (error) {
      console.error('Error fetching photos from database:', error)
      return []
    }
  }

  async savePhoto(photo: Photo): Promise<boolean> {
    console.log('[DB] savePhoto called for photo:', photo.id)
    await this.waitForReady()

    try {
      const db = await this.ensureConnection()
      console.log('[DB] Executing savePhoto with valid connection')

      await db.runAsync(
        `INSERT OR REPLACE INTO photos
         (id, farmId, uri, description, timestamp, syncStatus)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          photo.id,
          photo.farmId,
          photo.uri,
          photo.description || null,
          photo.timestamp,
          photo.syncStatus,
        ]
      )

      console.log('[DB] savePhoto successful for photo:', photo.id)
      return true
    } catch (error) {
      console.error('[DB] Error saving photo:', error)
      return false
    }
  }

  // Offline actions
  async addOfflineAction(action: OfflineAction): Promise<boolean> {
    console.log('[DB] addOfflineAction called for action:', action.id)
    await this.waitForReady()

    try {
      const db = await this.ensureConnection()
      console.log('[DB] Executing addOfflineAction with valid connection')

      await db.runAsync(
        'INSERT INTO offline_actions (id, type, payload, timestamp, retryCount) VALUES (?, ?, ?, ?, ?)',
        [
          action.id,
          action.type,
          JSON.stringify(action.payload),
          action.timestamp,
          action.retryCount,
        ]
      )

      console.log('[DB] addOfflineAction successful for action:', action.id)
      return true
    } catch (error) {
      console.error('[DB] Error adding offline action:', error)
      return false
    }
  }

  async getOfflineActions(): Promise<OfflineAction[]> {
    await this.waitForReady()
    if (!this.db) return []

    try {
      const result = await this.db.getAllAsync(
        'SELECT * FROM offline_actions ORDER BY timestamp ASC'
      )
      return (result as OfflineActionRow[]).map(row => ({
        id: row.id,
        type: row.type as OfflineAction['type'],
        payload: JSON.parse(row.payload),
        timestamp: row.timestamp,
        retryCount: row.retryCount,
      }))
    } catch (error) {
      console.error('Error fetching offline actions from database:', error)
      return []
    }
  }

  async removeOfflineAction(id: string): Promise<boolean> {
    console.log('[DB] removeOfflineAction called for action:', id)
    await this.waitForReady()

    try {
      const db = await this.ensureConnection()
      console.log('[DB] Executing removeOfflineAction with valid connection')

      await db.runAsync('DELETE FROM offline_actions WHERE id = ?', [id])

      console.log('[DB] removeOfflineAction successful for action:', id)
      return true
    } catch (error) {
      console.error('[DB] Error removing offline action:', error)
      return false
    }
  }

  async updateSyncStatus(
    table: string,
    id: string,
    status: 'synced' | 'pending' | 'failed'
  ): Promise<boolean> {
    console.log('[DB] updateSyncStatus called for table:', table, 'id:', id, 'status:', status)
    await this.waitForReady()

    try {
      const db = await this.ensureConnection()
      console.log('[DB] Executing updateSyncStatus with valid connection')

      await db.runAsync(`UPDATE ${table} SET syncStatus = ? WHERE id = ?`, [status, id])

      console.log('[DB] updateSyncStatus successful')
      return true
    } catch (error) {
      console.error('[DB] Error updating sync status:', error)
      return false
    }
  }

  // Helper methods
  private mapRowToFarm(row: unknown): Farm {
    const r = row as FarmRow
    return {
      id: r.id,
      name: r.name,
      location: r.location,
      coordinates: {
        latitude: r.latitude,
        longitude: r.longitude,
      },
      area: r.area,
      ownerId: r.ownerId,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      syncStatus: r.syncStatus as Farm['syncStatus'],
    }
  }

  private mapRowToPhoto(row: unknown): Photo {
    const r = row as PhotoRow
    return {
      id: r.id,
      farmId: r.farmId,
      uri: r.uri,
      description: r.description ?? undefined,
      timestamp: r.timestamp,
      syncStatus: r.syncStatus as Photo['syncStatus'],
    }
  }

  async clearAllData(): Promise<boolean> {
    console.log('[DB] clearAllData called')
    await this.waitForReady()

    try {
      const db = await this.ensureConnection()
      console.log('[DB] Executing clearAllData with valid connection')

      await db.execAsync(`
        DELETE FROM farms;
        DELETE FROM photos;
        DELETE FROM offline_actions;
      `)

      console.log('[DB] clearAllData successful')
      return true
    } catch (error) {
      console.error('[DB] Error clearing data:', error)
      return false
    }
  }
}

export const dbService = new DatabaseService()
