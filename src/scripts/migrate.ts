import { neon } from "@neondatabase/serverless";
import { logger } from "../config/logger";
import dotenv from "dotenv";

dotenv.config();

const migrate = async () => {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL environment variable is not set");
    }

    const sql = neon(databaseUrl);

    logger.info("Starting database migration...");

    // Create extension
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`;

    // Parents table
    await sql`
      CREATE TABLE IF NOT EXISTS parents (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        father_first_name VARCHAR(100) NOT NULL,
        father_last_name VARCHAR(100) NOT NULL,
        father_phone VARCHAR(20) NOT NULL,
        father_email VARCHAR(255) NOT NULL UNIQUE,
        mother_first_name VARCHAR(100),
        mother_last_name VARCHAR(100),
        mother_phone VARCHAR(20),
        mother_email VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;

    // Teachers table
    await sql`
      CREATE TABLE IF NOT EXISTS teachers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(200) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(20) NOT NULL,
        specialization TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;

    // Classes table
    await sql`
      CREATE TABLE IF NOT EXISTS classes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(200) NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        age_min INTEGER NOT NULL,
        age_max INTEGER NOT NULL,
        teacher_id UUID REFERENCES teachers(id),
        max_students INTEGER NOT NULL DEFAULT 20,
        current_students INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;

    // Students table
    await sql`
      CREATE TABLE IF NOT EXISTS students (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        date_of_birth DATE NOT NULL,
        age INTEGER NOT NULL,
        class_id UUID REFERENCES classes(id),
        registration_status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;

    // Admins table
    await sql`
      CREATE TABLE IF NOT EXISTS admins (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'admin',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;

    // Indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_students_parent_id ON students(parent_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_students_age ON students(age);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_students_status ON students(registration_status);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_parents_father_email ON parents(father_email);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_classes_age_range ON classes(age_min, age_max);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);`;

    // Trigger function
    await sql`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;
        const tables = ["parents", "teachers", "classes", "students", "admins"];
        for (const table of tables) {
        const triggerName = `update_${table}_updated_at`;

        await sql(`DROP TRIGGER IF EXISTS ${triggerName} ON ${table};`);

        await sql(`
            CREATE TRIGGER ${triggerName}
            BEFORE UPDATE ON ${table}
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        `);
        }

    logger.info("✅ Database migration completed successfully.");
    process.exit(0);
  } catch (error) {
    logger.error("❌ Migration failed:", error);
    process.exit(1);
  }
};

migrate();
