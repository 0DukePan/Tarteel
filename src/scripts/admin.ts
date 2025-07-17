import { neon, NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import bcrypt from "bcryptjs";
import { admins } from "../db/schema";
import { logger } from "../config/logger";
import dotenv from "dotenv";

dotenv.config();

const insertAdmin = async () => {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL environment variable is not set");
    }

    const sql = neon(databaseUrl) as NeonQueryFunction<boolean, boolean>;
    const db = drizzle(sql, {
      schema: { admins },
    });

    logger.info("Starting admin insertion...");

    // Hash the password
    const hashedPassword = await bcrypt.hash("admin123", 12);

    // Insert admin
    await db.insert(admins).values({
      username: "newAdmin",
      email: "newadmin@quranschool.com",
      password: hashedPassword,
      role: "admin",
    });

    logger.info("Admin inserted successfully");
    process.exit(0);
  } catch (error) {
    logger.error("Error inserting admin:", error);
    process.exit(1);
  }
};

insertAdmin();