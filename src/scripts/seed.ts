import { neon, NeonQueryFunction } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import bcrypt from "bcryptjs"
import { teachers, classes, admins } from "../db/schema"
import { logger } from "../config/logger"
import dotenv from "dotenv"

dotenv.config()

const seed = async () => {
  try {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      throw new Error("DATABASE_URL environment variable is not set")
    }

    const sql = neon(databaseUrl) as NeonQueryFunction<boolean, boolean>
    const db = drizzle(sql, {
      schema: { teachers, classes, admins },
    })

    logger.info("Starting database seeding...")

    // Clear existing data
    await db.delete(classes)
    await db.delete(teachers)
    await db.delete(admins)

    // Insert teachers
    const teacherData = await db.insert(teachers).values([
      {
        name: "Ahmed mahmoud",
        email: "ahmed.mahmoud@quranschool.com",
        phone: "+1234567890",
        specialization: "Quran Recitation & Tajweed",
      },
      {
        name: "Fatima Al-Zahra",
        email: "fatima.zahra@quranschool.com",
        phone: "+1234567891",
        specialization: "Arabic Language & Grammar",
      },
      {
        name: "Omar said",
        email: "omar.said@quranschool.com",
        phone: "+1234567892",
        specialization: "Islamic Studies & Hadith",
      },
      {
        name: "Aisha selma ",
        email: "aisha.selma@quranschool.com",
        phone: "+1234567893",
        specialization: "Quran Memorization",
      },
    ]).returning()

    // Insert classes
    await db.insert(classes).values([
      {
        name: "Beginners (5-6 years)",
        startTime: "09:00",
        endTime: "11:00",
        ageMin: 5,
        ageMax: 6,
        teacherId: teacherData[0].id,
        maxStudents: 15,
      },
      {
        name: "Young Learners Morning (5-7 years)",
        startTime: "09:00",
        endTime: "11:00",
        ageMin: 5,
        ageMax: 7,
        teacherId: teacherData[1].id,
        maxStudents: 20,
      },
      {
        name: "Young Learners Midday (5-7 years)",
        startTime: "11:15",
        endTime: "13:15",
        ageMin: 5,
        ageMax: 7,
        teacherId: teacherData[0].id,
        maxStudents: 20,
      },
      {
        name: "Elementary Morning (7-10 years)",
        startTime: "09:00",
        endTime: "11:00",
        ageMin: 7,
        ageMax: 10,
        teacherId: teacherData[2].id,
        maxStudents: 25,
      },
      {
        name: "Elementary Midday (7-10 years)",
        startTime: "11:15",
        endTime: "13:15",
        ageMin: 7,
        ageMax: 10,
        teacherId: teacherData[1].id,
        maxStudents: 25,
      },
      {
        name: "Elementary Afternoon (7-10 years)",
        startTime: "13:30",
        endTime: "15:30",
        ageMin: 7,
        ageMax: 10,
        teacherId: teacherData[3].id,
        maxStudents: 25,
      },
      {
        name: "Intermediate Morning (10-12 years)",
        startTime: "09:00",
        endTime: "11:00",
        ageMin: 10,
        ageMax: 12,
        teacherId: teacherData[0].id,
        maxStudents: 20,
      },
      {
        name: "Intermediate Afternoon (10-12 years)",
        startTime: "13:30",
        endTime: "15:30",
        ageMin: 10,
        ageMax: 12,
        teacherId: teacherData[2].id,
        maxStudents: 20,
      },
      {
        name: "Advanced Morning (12-14 years)",
        startTime: "09:00",
        endTime: "11:00",
        ageMin: 12,
        ageMax: 14,
        teacherId: teacherData[1].id,
        maxStudents: 18,
      },
      {
        name: "Advanced Afternoon (12-14 years)",
        startTime: "13:30",
        endTime: "15:30",
        ageMin: 12,
        ageMax: 14,
        teacherId: teacherData[3].id,
        maxStudents: 18,
      },
    ])

    // Insert admin
    const hashedPassword = await bcrypt.hash("admin123", 12)
    await db.insert(admins).values({
      username: "admin",
      email: "admin@quranschool.com",
      password: hashedPassword,
      role: "super_admin",
    })
    // Insert admin
    await db.insert(admins).values({
      username: "newAdmin",
      email: "newadmin@quranschool.com",
      password: hashedPassword,
      role: "admin",
    });

    logger.info("Database seeded successfully")
    process.exit(0)
  } catch (error) {
    logger.error("Error seeding database:", error)
    process.exit(1)
  }
  
}


seed()
