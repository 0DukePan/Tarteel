import { logger } from '../config/logger'
import type { Request , Response , NextFunction } from 'express'
import { ApiResponse } from '../types'
// import {logger} from '../config/database'
export class AppError extends Error {
    public statusCode : number 
    public isOperational : boolean

    constructor(message: string , statusCode : number) {
        super(message)
        this.statusCode = statusCode
        this.isOperational = true
        Error.captureStackTrace(this , this.constructor) 
    }
}
export const  errorHanlder = (error : Error | AppError , req : Request , res : Response , next : NextFunction) => {
    let statusCode = 500
    let message = 'Internal Server Error'

    //log Error
    logger.error('Error occured', {
        error : error.message,
        stack : error.stack,
        url : req.url,
        method : req.url,
        ip : req.ip,
        userAgent  : req.get('User-Agent')
    })
    //handle diffrent error types
    if(error instanceof AppError){
        statusCode = error.statusCode
        message = error.message
    }else if (error.name === 'ValidationError'){
        statusCode = 400
        message = 'Validation Error'
    }else if(error.message.includes('duplicate key')){
        statusCode = 409
        message = 'Duplicate field value'
    }else if (error.name === 'JsonWebTokenError'){
        statusCode = 401
        message = 'Invalid Token'
    }else if (error.name === 'TokenExpiredError'){
        statusCode = 401
        message = 'Token Expired'
    }

    //dont leak error details in production 
    if(process.env.NODE_ENV === 'production' && statusCode === 500){
        message = 'Internal Server Error'
    }
    res.status(statusCode).json({
        success : false,
        error : message,
        ...(process.env.NODE_ENV === 'development' && {stack  : error.stack})
    })
}

export const notFound = (req : Request ,  res: Response , next : NextFunction) => {
    const error = new AppError(`Route ${req.originalUrl} not found` , 404)
    next(error)
}

export const asyncHandler = (fn : Function)=> {
    return (req : Request , res : Response , next : NextFunction) => {
        Promise.resolve(fn(req , res , next)).catch(next)
    }
}