import { eq } from "drizzle-orm"
import { database } from "../config/database"
import { admins } from "../db/schema"
import { Request, Response } from "express"
import bcrypt from 'bcryptjs'
import  jwt from 'jsonwebtoken';
import type {  JWTPayload } from "../types"
import dotenv from 'dotenv'
import { AppError } from "middleware/errorHandler"
dotenv.config()

export const login = async (req : Request , res : Response) => {
    const db = database.getDb() 
    const {email, password} = req.body
    //find admin
    const  adminResult = await db.select().from(admins).where(eq(admins.email, email)).limit(1)
    const admin = adminResult[0]
    if(!admin || !admin.isActive){
        throw new Error('Invalid email or password')
    }

    //check password
    const isPasswordValid = await bcrypt.compare(password , admin.password)
    if(!isPasswordValid){
        throw new Error('Invalid email or password')
    }

    //generate JWT token
    const jwtSecret = process.env.JWT_SECRET
    if(!jwtSecret) {
        throw new Error('JWT_SECRET environment variable is not set')
    }

    const jwtOptions: jwt.SignOptions = {
        expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'],
    };
      
      
      const payload: JWTPayload = {
        adminId: admin.id,
        email: admin.email,
        role: admin.role,
      };
      
      const token = jwt.sign(payload, jwtSecret as jwt.Secret, jwtOptions);
      
    //remove password from response 
    const {password : _ , ...adminResponse} = admin

    console.log(`Admin login successful : ${admin.email}`);

    res.json({
        success : true,
        message : 'Admin login successful',
        data : {
            admin : adminResponse,
            token
        }
    })
}

export const getProfile = async (req : Request , res : Response) => {
    const db = database.getDb()
    const admin = await db.select().from(admins).where(eq(admins.id , req.admin.id)).limit(1)
    if(admin.length === 0 ){
        throw new AppError('Admin not found' , 404)
    }
    const {password , ...adminWithoutPassword} = admin[0]
    res.json({
        success : true,
        data : adminWithoutPassword
    })
}

export const updateProfile = async (req : Request , res : Response) => {
    const db = database.getDb()
    const {username , email} = req.body

    await db.update(admins).set({
        username,
        email,
        updatedAt : new Date()
    }).where(eq(admins.id , req.admin.id))

    const updatedAdminResult = await db.select().from(admins).where(eq(admins.id , req.admin.id)).limit(1)
    const {password , ...adminWithoutPassword} = updatedAdminResult[0]
    res.json({
        success : true,
        message : 'Profile updated successfully',
        admin : adminWithoutPassword
    })
    
}
