import express from "express"
import cors from "cors"
import helmet from "helmet"
import compression from "compression"
import rateLimit from "express-rate-limit"
import dotenv from "dotenv"

import { database } from "./config/database"
import { logger } from "./config/logger"
import { errorHanlder, notFound } from "./middleware/errorHandler"
import { Request, Response, NextFunction } from "express"
// Import routes
import registrationRoutes from "./routes/registration.routes"
import classRoutes from "./routes/class.routes"
import teacherRoutes from "./routes/teacher.routes"
import authRoutes from "./routes/auth.routes"

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Security middleware
app.use(helmet())
app.use(cors({
  origin: 'https://tarteel-front-gipv.vercel.app',
  credentials: true,
}))


// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: "Too many requests from this IP, please try again later.",
  },
})
app.use("/api/", limiter)

// Body parsing middleware
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))



// Compression
app.use(compression())

// Request logging

app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`)
  next()
})

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  })
})

// API routes
app.use("/api/auth", authRoutes)
app.use("/api/registrations", registrationRoutes)
app.use("/api/classes", classRoutes)
app.use("/api/teachers", teacherRoutes)

// 404 handler
app.use(notFound)

// Global error handler
app.use(errorHanlder)

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await database.connect()

    // Start server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`)
      logger.info(`Environment: ${process.env.NODE_ENV || "development"}`)
    })
  } catch (error) {
    logger.error("Failed to start server:", error)
    process.exit(1)
  }
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (err: Error) => {
  logger.error("Unhandled Promise Rejection:", err)
  process.exit(1)
})

// Handle uncaught exceptions
process.on("uncaughtException", (err: Error) => {
  logger.error("Uncaught Exception:", err)
  process.exit(1)
})

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully")
  await database.disconnect()
  process.exit(0)
})

startServer()