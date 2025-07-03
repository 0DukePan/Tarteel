import express from 'express'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.routes'
import {database} from './config/database'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(express.json({
    limit : '10mb'
}))

app.use('/api/auth' , authRoutes)
const startServer = async () => {
    try {
        //connect to db
        await database.connect()
        
        app.listen(PORT , () => {
            console.log(`Server is running on port ${PORT}`)
            console.log(`Environment : ${process.env.NODE_ENV} || "development"`);
        })
    } catch (error) {
        console.log('Failed to start error:', error);
        process.exit(1)
    }
} 



startServer()
