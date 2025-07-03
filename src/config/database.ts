import {neon} from '@neondatabase/serverless'
import {drizzle} from 'drizzle-orm/neon-http'
import * as schema from '../db/schema'
import e from 'express'
class Database{
    private static instance : Database // ensure there's only ine instance of the database class
    private db : ReturnType<typeof drizzle> | null = null
    private isConnected = false

    private constructor(){}
    
    public static getInstance() : Database {
        if(!Database.instance){
            Database.instance = new Database()
        }
        return Database.instance
    }

    public async connect() : Promise<void> {
        if(this.isConnected && this.db) {
            console.log('database is already connected');
            return
        }

        try {
            const databaseUrl = process.env.DATABASE_URL
            if(!databaseUrl){
                throw new Error('DATABASE_URL environment variable is not set')
            }
            const sql = neon(databaseUrl)
            this.db = drizzle(sql  , {schema})

            //test connection 
            await sql`SELECT 1`
            this.isConnected = true
            console.log('Neon connected successfully');
            
        } catch (error) {
            console.error('Failed to connect to Neon:', error);
            throw error
        }
    }
    public getDb() : ReturnType<typeof drizzle> {
        if(!this.db){
            throw new Error('Database is not connected call connect() first')
        }
        return this.db
    }
    public getConnectionStatus() : boolean {
        return this.isConnected
    }
    public async disconnect() : Promise<void>{
        //neon serverless doesn/t require explicit disconnection
        this.isConnected = false
        this.db = null
        console.log('Disconnected from Neon');
    }

}

export const database = Database.getInstance()