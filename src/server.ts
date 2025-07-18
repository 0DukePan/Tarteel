import express, { Request, Response, NextFunction } from "express"
import cors from "cors"
import helmet from "helmet"
import compression from "compression"
import rateLimit from "express-rate-limit"
import dotenv from "dotenv"

import { database } from "./config/database"
import { logger } from "./config/logger"
import { errorHanlder, notFound } from "./middleware/errorHandler"

// Routes
import registrationRoutes from "./routes/registration.routes"
import classRoutes from "./routes/class.routes"
import teacherRoutes from "./routes/teacher.routes"
import authRoutes from "./routes/auth.routes"

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.set("trust proxy", 1)

app.use(helmet())

app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://tarteel-front-gipv.vercel.app',
      'http://localhost:3000',
    ]
    if (!origin) {
      // allow non-browser tools like curl/postman
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(null, false); 
    }
  },
  credentials: true,
}));



const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    error: "Too many requests from this IP, please try again later.",
  },
})
app.use("/api/", limiter)

app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

app.use(compression())

app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`)
  next()
})

app.get("/", (req : Request, res : Response) => {
  res.send("Quran School API - Online")
})

app.get("/health", (req : Request, res : Response) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  })
})

app.use("/api/auth", authRoutes)
app.use("/api/registrations", registrationRoutes)
app.use("/api/classes", classRoutes)
app.use("/api/teachers", teacherRoutes)

app.use(notFound)

app.use(errorHanlder)

const startServer = async () => {
  try {
    await database.connect()
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`)
      logger.info(`Environment: ${process.env.NODE_ENV || "development"}`)
    })
  } catch (error) {
    logger.error("Failed to start server:", error)
    process.exit(1)
  }
}

process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully")
  await database.disconnect()
  process.exit(0)
})

process.on("unhandledRejection", (err: Error) => {
  logger.error("Unhandled Promise Rejection:", err)
  process.exit(1)
})

process.on("uncaughtException", (err: Error) => {
  logger.error("Uncaught Exception:", err)
  process.exit(1)
})

startServer()
