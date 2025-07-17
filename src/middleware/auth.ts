import { NextFunction  , Request, Response} from "express";
import { logger } from "../config/logger";
import jwt from 'jsonwebtoken'
import { JWTPayload } from "../types";
import { database } from '@/config/database' 
import { eq } from "drizzle-orm";
import { admins } from "db/schema";

//Extends Express's Request type to optionally include admin
declare global {
    namespace Express {
        interface Request {
            admin? : any
        }
    }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    console.log(`authenticate: Processing token for request to ${req.path}`);

    if (!token) {
      console.error("authenticate: No token provided");
      res.status(401).json({ success: false, error: "Access denied. No token provided." });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("authenticate: JWT_SECRET is not defined");
      res.status(500).json({ success: false, error: "Server configuration error" });
      return;
    }

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    console.log(`authenticate: Token decoded for admin ID: ${decoded.adminId}`);

    const db = database.getDb();
    const adminResult = await db.select().from(admins).where(eq(admins.id, decoded.adminId)).limit(1);
    const admin = adminResult[0];

    if (!admin || !admin.isActive) {
      console.error(`authenticate: Invalid token or inactive admin for ID: ${decoded.adminId}`);
      res.status(401).json({ success: false, error: "Invalid token or admin account is inactive" });
      return;
    }

    const { password, ...adminWithoutPassword } = admin;
    req.admin = adminWithoutPassword;
    next();
  } catch (error) {
    console.error(`authenticate: Authentication error for ${req.path}:`, error);
    res.status(401).json({ success: false, error: "Invalid token" });
    return;
  }
};


export const authorize = (...roles : string[]) => {
    return (req : Request , res : Response , next : NextFunction) : void => {
        if(!req.admin){
             res.status(401).json({
                success : false,
                message : 'Access denied , Authentication required'
            })
            return  //add return to stop execution
        }

        if(!roles.includes(req.admin.role)){
             res.status(403).json({
                success : false,
                message : 'Access denied , Insufficient permissions'    
            })
            return 
        }
        next()
    }
}