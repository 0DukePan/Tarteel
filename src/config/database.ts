import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '../db/schema'

class Database {
  private static instance: Database
  private db: ReturnType<typeof drizzle> | null = null
  private isConnected = false

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database()
    }
    return Database.instance
  }

  public async connect(): Promise<void> {
    if (this.isConnected && this.db) {
      console.log('Database is already connected')
      return
    }

    try {
      const databaseUrl = process.env.DATABASE_URL
      if (!databaseUrl) {
        throw new Error('DATABASE_URL environment variable is not set')
      }

      // ✅ Fix: explicitly define types <boolean, boolean>
      const sql = neon<boolean, boolean>(databaseUrl)
      this.db = drizzle(sql, { schema })

      await sql`SELECT 1`
      this.isConnected = true
      console.log('Neon connected successfully')
    } catch (error) {
      console.error('Failed to connect to Neon:', error)
      throw error
    }
  }

  public getDb(): ReturnType<typeof drizzle> {
    if (!this.db) {
      throw new Error('Database is not connected. Call connect() first.')
    }
    return this.db
  }

  public getConnectionStatus(): boolean {
    return this.isConnected
  }

  public async disconnect(): Promise<void> {
    // Neon serverless doesn’t require disconnection
    this.isConnected = false
    this.db = null
    console.log('Disconnected from Neon')
  }
}

export const database = Database.getInstance()
