import express from 'express'
import dotenv from 'dotenv'

import authRoutes from './routes/auth.routes'
import classRoutes from './routes/class.routes'
import teacherRoutes from './routes/teacher.routes'
import registrationRoutes from './routes/registration.routes'
import {database} from './config/database'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import compression from 'compression'
import { logger } from './config/logger'
import { errorHanlder, notFound } from './middleware/errorHandler'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(express.json({
    limit : '10mb'
}))

app.use(helmet())

const limiter = rateLimit({
    windowMs : 15 * 60 * 1000 , //15 minutes
    max : 100 ,//limit each ip to 100 requests per windowMs
    message : {
        success : false ,
        error : 'Too many requests from this IP , please try again after 15 minutes'
    }
})
app.use('/api/' , limiter)

app.use(compression())

//request loging 
app.use((req , res , next) => {
    logger.info(`${req.method} ${req.url} - ${req.ip}}`)
})

//health check endpoint

app.get('/health' , (req ,res)=> {
    res.json({
        success : true,
        message : 'Server is running',
        timestamp  : new Date().toISOString(),
        environment : process.env.NODE_ENV || 'development'
    })
})

app.use(notFound)
app.use(errorHanlder)


app.use('/api/auth' , authRoutes)
app.use('/api/classes' , classRoutes)
app.use('/api/teachers' , teacherRoutes)
app.use('/api/registration' , registrationRoutes)
const startServer = async () => {
    try {
        //connect to db
        await database.connect()
        
        app.listen(PORT , () => {
           logger.info(`Server is running on port ${PORT}`)
           logger.info(`Environment : ${process.env.NODE_ENV || 'development'}`)
        })
    } catch (error) {
        logger.error('Failed to start server' , error)
        process.exit(1)
    }
} 

process.on('unhandledRejection' , (err : Error)=>{
    logger.error('Unhandled Promise Rejection' , err)
    process.exit(1)
})

process.on('uncaughtException' , (err : Error)=>{
    logger.error('Uncaught Exception' , err)
    process.exit(1)
})

process.on('SIGTERM' , async () => {
    logger.info('SIGTERM received , shuting down gracefully')
    await database.disconnect()
    process.exit(0)
})

startServer()
