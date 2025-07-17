import { classes, parents, students, teachers } from "../db/schema";
import { database } from "../config/database";
import { RegistrationRequest, QueryOptions, PaginatedResponse, RegistrationWithDetails } from "../types";
import { eq, ilike, or, count, asc, and, desc, sql } from "drizzle-orm";
import { AppError } from "../middleware/errorHandler";
import { logger } from "../config/logger";

export class RegistrationService {
  private getDb() {
    return database.getDb();
  }

  async createRegistration(registrationData: RegistrationRequest): Promise<{ parentId: string; studentId: string }> {
    try {
      const db = this.getDb();
      const { parent: parentData, student: studentData } = registrationData;

      // Check if classId is provided
      if (!studentData.classId) {
        throw new AppError("Class ID is required", 400);
      }

      // Check if class exists and has available spots
      const selectedClassResult = await db.select().from(classes).where(eq(classes.id, studentData.classId)).limit(1);

      const selectedClass = selectedClassResult[0];
      if (!selectedClass) {
        throw new AppError("Selected class is not found", 404);
      }
      if (selectedClass.currentStudents >= selectedClass.maxStudents) {
        throw new AppError("Selected class is full", 400);
      }

      // Calculate age
      const today = new Date();
      const birthDate = new Date(studentData.dateOfBirth);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      // Check if student age is appropriate for the class
      if (age < selectedClass.ageMin || age > selectedClass.ageMax) {
        throw new AppError(`Student age (${age}) is not appropriate for the class`, 400);
      }

      // Check if parent already exists
      const existingParentResult = await db
        .select()
        .from(parents)
        .where(eq(parents.fatherEmail, parentData.fatherEmail))
        .limit(1);
      let parentId: string;

      if (existingParentResult.length > 0) {
        // Update existing parent
        parentId = existingParentResult[0].id;
        await db
          .update(parents)
          .set({
            ...parentData,
            updatedAt: new Date(),
          })
          .where(eq(parents.id, parentId));
      } else {
        // Create new parent
        const newParentResult = await db.insert(parents).values(parentData).returning({ id: parents.id });
        parentId = newParentResult[0].id;
      }

      // Create student
      const newStudentResult = await db
        .insert(students)
        .values({
          ...studentData,
          parentId,
          age,
          registrationStatus: "pending",
          dateOfBirth: new Date(studentData.dateOfBirth).toISOString().split("T")[0],
        })
        .returning({ id: students.id });

      const studentId = newStudentResult[0].id;
      logger.info(`New registration created - Student: ${studentId}, Parent: ${parentId}`);
      return { parentId, studentId };
    } catch (error) {
      logger.error("Error creating registration", error);
      throw error;
    }
  }

  async getRegistrations(options: QueryOptions): Promise<PaginatedResponse<RegistrationWithDetails>> {
    try {
      const db = this.getDb();
      const {
        page = 1,
        limit = 10,
        sort = "-createdAt",
        search = "",
        status = "",
        classId = "",
      } = options;

      // Build filtering conditions to ensure valid student records
      const conditions = [
        and(
          sql`${students.id} IS NOT NULL`,
          sql`${students.firstName} IS NOT NULL`,
          sql`${students.lastName} IS NOT NULL`,
          sql`${students.parentId} IS NOT NULL`,
          sql`${students.registrationStatus} IN ('pending', 'approved', 'rejected')`
        ),
      ];

      if (status && status !== "all") {
        conditions.push(eq(students.registrationStatus, status as any));
      }

      if (classId && classId !== "all") {
        conditions.push(eq(students.classId, classId));
      }

      if (search) {
        conditions.push(
          or(
            ilike(students.firstName, `%${search}%`),
            ilike(students.lastName, `%${search}%`),
            ilike(parents.fatherFirstName, `%${search}%`),
            ilike(parents.fatherLastName, `%${search}%`),
            ilike(parents.fatherEmail, `%${search}%`)
          )
        );
      }

      // Get total count
      const countQuery = db.select({ count: count() }).from(students).innerJoin(parents, eq(students.parentId, parents.id));

      const totalResult = conditions.length > 0 ? await countQuery.where(and(...conditions)) : await countQuery;

      const total = totalResult[0].count;

      // Determine sorting
      const sortField = sort.startsWith("-") ? sort.substring(1) : sort;
      const isDescending = sort.startsWith("-");

      const sortOrder = (() => {
        switch (sortField) {
          case "createdAt":
            return isDescending ? desc(students.createdAt) : asc(students.createdAt);
          case "firstName":
            return isDescending ? desc(students.firstName) : asc(students.firstName);
          case "lastName":
            return isDescending ? desc(students.lastName) : asc(students.lastName);
          default:
            return desc(students.createdAt);
        }
      })();

      const offset = (page - 1) * limit;

      // Final query with nested student object
      const registrations = await db
        .select({
          student: {
            id: students.id,
            parentId: students.parentId,
            firstName: students.firstName,
            lastName: students.lastName,
            dateOfBirth: students.dateOfBirth,
            age: students.age,
            classId: students.classId,
            registrationStatus: students.registrationStatus,
            createdAt: students.createdAt,
            updatedAt: students.updatedAt,
          },
          parent: {
            id: parents.id,
            fatherFirstName: parents.fatherFirstName,
            fatherLastName: parents.fatherLastName,
            fatherPhone: parents.fatherPhone,
            fatherEmail: parents.fatherEmail,
            motherFirstName: parents.motherFirstName,
            motherLastName: parents.motherLastName,
            motherPhone: parents.motherPhone,
            motherEmail: parents.motherEmail,
          },
          class: {
            id: classes.id,
            name: classes.name,
            startTime: classes.startTime,
            endTime: classes.endTime,
            ageMin: classes.ageMin,
            ageMax: classes.ageMax,
            maxStudents: classes.maxStudents,
            currentStudents: classes.currentStudents,
          },
          teacher: {
            id: teachers.id,
            name: teachers.name,
            email: teachers.email,
            phone: teachers.phone,
            specialization: teachers.specialization,
          },
        })
        .from(students)
        .innerJoin(parents, eq(students.parentId, parents.id))
        .leftJoin(classes, eq(students.classId, classes.id))
        .leftJoin(teachers, eq(classes.teacherId, teachers.id))
        .where(and(...conditions))
        .orderBy(sortOrder)
        .limit(limit)
        .offset(offset);

      // Validate and filter registrations
      const validRegistrations = registrations
        .map((reg) => {
          if (!reg.student.id || !reg.student.firstName || !reg.student.lastName || !reg.student.parentId || !reg.parent) {
            logger.warn("Invalid registration record in getRegistrations:", {
              studentId: reg.student.id,
              firstName: reg.student.firstName,
              lastName: reg.student.lastName,
              parentId: reg.student.parentId,
              hasParent: !!reg.parent,
            });
            return null;
          }
          return {
            student: {
              ...reg.student,
              dateOfBirth: new Date(reg.student.dateOfBirth).toISOString(),
              createdAt: reg.student.createdAt, // Keep as Date
              updatedAt: reg.student.updatedAt, // Keep as Date
            },
            parent: reg.parent,
            class: reg.class,
            teacher: reg.teacher,
          } as RegistrationWithDetails;
        })
        .filter((reg): reg is RegistrationWithDetails => reg !== null);

      if (registrations.length > validRegistrations.length) {
        logger.error(`Filtered out ${registrations.length - validRegistrations.length} invalid registrations in getRegistrations`);
      }

      return {
        success: true,
        data: validRegistrations,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error("Error fetching registrations:", error);
      throw new AppError("Failed to fetch registrations", 500);
    }
  }

  async updateRegistrationStatus(studentId: string, status: "pending" | "approved" | "rejected"): Promise<void> {
    try {
      const db = this.getDb();

      // Get current student data
      const studentResult = await db
        .select({
          id: students.id,
          firstName: students.firstName,
          lastName: students.lastName,
          parentId: students.parentId,
          classId: students.classId,
          registrationStatus: students.registrationStatus,
        })
        .from(students)
        .where(eq(students.id, studentId))
        .limit(1);
      const student = studentResult[0];

      if (!student) {
        throw new AppError("Student not found", 404);
      }
      if (!student.id || !student.firstName || !student.lastName || !student.parentId) {
        logger.warn("Invalid student record for updateRegistrationStatus:", {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          parentId: student.parentId,
        });
        throw new AppError("Invalid student record: missing required fields", 400);
      }
      const oldStatus = student.registrationStatus;

      // Update student status
      await db
        .update(students)
        .set({
          registrationStatus: status,
          updatedAt: new Date(),
        })
        .where(eq(students.id, studentId));

      // Update class current students count
      if (student.classId) {
        if (status === "approved" && oldStatus !== "approved") {
          await db
            .update(classes)
            .set({
              currentStudents: sql`${classes.currentStudents} + 1`,
              updatedAt: new Date(),
            })
            .where(eq(classes.id, student.classId));
        } else if (status !== "approved" && oldStatus === "approved") {
          await db
            .update(classes)
            .set({
              currentStudents: sql`${classes.currentStudents} - 1`,
              updatedAt: new Date(),
            })
            .where(eq(classes.id, student.classId));
        }
      }
      logger.info(`Registration status updated - Student: ${studentId}, Status: ${status}`);
    } catch (error) {
      logger.error("Error updating registration status", error);
      throw error;
    }
  }

  async getRegistrationById(studentId: string): Promise<RegistrationWithDetails | null> {
    try {
      const db = this.getDb();
      const result = await db
        .select({
          student: {
            id: students.id,
            parentId: students.parentId,
            firstName: students.firstName,
            lastName: students.lastName,
            dateOfBirth: students.dateOfBirth,
            age: students.age,
            classId: students.classId,
            registrationStatus: students.registrationStatus,
            createdAt: students.createdAt,
            updatedAt: students.updatedAt,
          },
          parent: {
            id: parents.id,
            fatherFirstName: parents.fatherFirstName,
            fatherLastName: parents.fatherLastName,
            fatherPhone: parents.fatherPhone,
            fatherEmail: parents.fatherEmail,
            motherFirstName: parents.motherFirstName,
            motherLastName: parents.motherLastName,
            motherPhone: parents.motherPhone,
            motherEmail: parents.motherEmail,
          },
          class: {
            id: classes.id,
            name: classes.name,
            startTime: classes.startTime,
            endTime: classes.endTime,
            ageMin: classes.ageMin,
            ageMax: classes.ageMax,
            maxStudents: classes.maxStudents,
            currentStudents: classes.currentStudents,
          },
          teacher: {
            id: teachers.id,
            name: teachers.name,
            email: teachers.email,
            phone: teachers.phone,
            specialization: teachers.specialization,
          },
        })
        .from(students)
        .innerJoin(parents, eq(students.parentId, parents.id))
        .leftJoin(classes, eq(students.classId, classes.id))
        .leftJoin(teachers, eq(classes.teacherId, teachers.id))
        .where(
          and(
            eq(students.id, studentId),
            sql`${students.id} IS NOT NULL`,
            sql`${students.firstName} IS NOT NULL`,
            sql`${students.lastName} IS NOT NULL`,
            sql`${students.parentId} IS NOT NULL`,
            sql`${students.registrationStatus} IN ('pending', 'approved', 'rejected')`
          )
        )
        .limit(1);

      const reg = result[0];
      if (!reg) {
        return null;
      }
      if (!reg.student.id || !reg.student.firstName || !reg.student.lastName || !reg.student.parentId || !reg.parent) {
        logger.warn("Invalid registration record in getRegistrationById:", {
          studentId: reg.student.id,
          firstName: reg.student.firstName,
          lastName: reg.student.lastName,
          parentId: reg.student.parentId,
          hasParent: !!reg.parent,
        });
        throw new AppError("Invalid registration record: missing required fields", 400);
      }

      return {
        student: {
          ...reg.student,
          dateOfBirth: new Date(reg.student.dateOfBirth).toISOString(), 
          createdAt: reg.student.createdAt, 
          updatedAt: reg.student.updatedAt, 
        },
        parent: reg.parent,
        class: reg.class,
        teacher: reg.teacher,
      };
    } catch (error) {
      logger.error("Error fetching registration by id", error);
      throw error;
    }
  }

  //Neon with the neon-http driver, and this driver does not support database transactions. This is a known limitation in the @neondatabase/serverless (neon-http) driver.
  // async updateRegistrationClass(studentId: string, classId: string | null): Promise<void> {
  //   try {
  //     const db = this.getDb();
  //     // Start a transaction
  //     await db.transaction(async (tx) => {
  //       // Fetch student
  //       const [student] = await tx
  //         .select({
  //           id: students.id,
  //           age: students.age,
  //           classId: students.classId,
  //           firstName: students.firstName,
  //           lastName: students.lastName,
  //           parentId: students.parentId,
  //         })
  //         .from(students)
  //         .where(eq(students.id, studentId))
  //         .limit(1);
  //       if (!student || !student.id || !student.firstName || !student.lastName || !student.parentId) {
  //         logger.warn("Invalid student record for updateRegistrationClass:", {
  //           id: student?.id,
  //           firstName: student?.firstName,
  //           lastName: student?.lastName,
  //           parentId: student?.parentId,
  //         });
  //         throw new AppError("Student not found or invalid", 404);
  //       }

  //       // If classId is null, unassign the student
  //       if (!classId) {
  //         if (student.classId) {
  //           // Decrease currentStudents of old class
  //           await tx
  //             .update(classes)
  //             .set({
  //               currentStudents: sql`${classes.currentStudents} - 1`,
  //               updatedAt: new Date(),
  //             })
  //             .where(eq(classes.id, student.classId));
  //         }
  //         await tx
  //           .update(students)
  //           .set({
  //             classId: null,
  //             updatedAt: new Date(),
  //           })
  //           .where(eq(students.id, studentId));
  //         logger.info(`Student unassigned from class: ${studentId}`);
  //         return;
  //       }

  //       // Fetch new class
  //       const [newClass] = await tx
  //         .select({
  //           id: classes.id,
  //           ageMin: classes.ageMin,
  //           ageMax: classes.ageMax,
  //           maxStudents: classes.maxStudents,
  //           currentStudents: classes.currentStudents,
  //         })
  //         .from(classes)
  //         .where(eq(classes.id, classId))
  //         .limit(1);

  //       if (!newClass) {
  //         throw new AppError("Class not found", 404);
  //       }
  //       // Validate age
  //       if (student.age < newClass.ageMin || student.age > newClass.ageMax) {
  //         throw new AppError(`Student age (${student.age}) is not compatible with the class`, 400);
  //       }
  //       // Validate capacity
  //       if (newClass.currentStudents >= newClass.maxStudents) {
  //         throw new AppError("Class is full", 400);
  //       }

  //       // If student was assigned to a different class, decrease currentStudents of old class
  //       if (student.classId && student.classId !== classId) {
  //         await tx
  //           .update(classes)
  //           .set({
  //             currentStudents: sql`${classes.currentStudents} - 1`,
  //             updatedAt: new Date(),
  //           })
  //           .where(eq(classes.id, student.classId));
  //       }

  //       // Update student class
  //       await tx
  //         .update(students)
  //         .set({
  //           classId,
  //           updatedAt: new Date(),
  //         })
  //         .where(eq(students.id, studentId));

  //       // Increase currentStudents of new class
  //       await tx
  //         .update(classes)
  //         .set({
  //           currentStudents: sql`${classes.currentStudents} + 1`,
  //           updatedAt: new Date(),
  //         })
  //         .where(eq(classes.id, classId));
  //       logger.info(`Student (${studentId}) assigned to class: ${classId}`);
  //     });
  //   } catch (error) {
  //     logger.error("Error updating student class", error);
  //     throw error;
  //   }
  // }
  async updateRegistrationClass(studentId: string, classId: string | null): Promise<void> {
    try {
      const db = this.getDb();
  
      // Fetch student
      const [student] = await db
        .select({
          id: students.id,
          age: students.age,
          classId: students.classId,
          firstName: students.firstName,
          lastName: students.lastName,
          parentId: students.parentId,
        })
        .from(students)
        .where(eq(students.id, studentId))
        .limit(1);
  
      if (!student || !student.id || !student.firstName || !student.lastName || !student.parentId) {
        logger.warn("Invalid student record for updateRegistrationClass:", {
          id: student?.id,
          firstName: student?.firstName,
          lastName: student?.lastName,
          parentId: student?.parentId,
        });
        throw new AppError("Student not found or invalid", 404);
      }
  
      // If classId is null, unassign the student
      if (!classId) {
        if (student.classId) {
          const oldClassResult = await db
            .select()
            .from(classes)
            .where(eq(classes.id, student.classId))
            .limit(1);
          const oldClass = oldClassResult[0];
  
          if (oldClass && oldClass.currentStudents > 0) {
            await db
              .update(classes)
              .set({
                currentStudents: sql`${classes.currentStudents} - 1`,
                updatedAt: new Date(),
              })
              .where(eq(classes.id, student.classId));
          }
        }
  
        await db
          .update(students)
          .set({
            classId: null,
            updatedAt: new Date(),
          })
          .where(eq(students.id, studentId));
  
        logger.info(`Student unassigned from class: ${studentId}`);
        return;
      }
  
      // Fetch new class
      const [newClass] = await db
        .select({
          id: classes.id,
          ageMin: classes.ageMin,
          ageMax: classes.ageMax,
          maxStudents: classes.maxStudents,
          currentStudents: classes.currentStudents,
        })
        .from(classes)
        .where(eq(classes.id, classId))
        .limit(1);
  
      if (!newClass) {
        throw new AppError("Class not found", 404);
      }
  
      // Validate age
      if (student.age < newClass.ageMin || student.age > newClass.ageMax) {
        throw new AppError(`Student age (${student.age}) is not compatible with the class`, 400);
      }
  
      // If student was in a different class, decrement old class
      if (student.classId && student.classId !== classId) {
        const oldClassResult = await db
          .select()
          .from(classes)
          .where(eq(classes.id, student.classId))
          .limit(1);
        const oldClass = oldClassResult[0];
  
        if (oldClass && oldClass.currentStudents > 0) {
          await db
            .update(classes)
            .set({
              currentStudents: sql`${classes.currentStudents} - 1`,
              updatedAt: new Date(),
            })
            .where(eq(classes.id, student.classId));
        }
      }
  
      // Update student class
      await db
        .update(students)
        .set({
          classId,
          updatedAt: new Date(),
        })
        .where(eq(students.id, studentId));
  
      // ✅ Safely increment only if class is not full
      const updateResult = await db
        .update(classes)
        .set({
          currentStudents: sql`${classes.currentStudents} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(classes.id, classId),
            sql`${classes.currentStudents} < ${newClass.maxStudents}`
          )
        );
  
      if ((updateResult as any).rowCount === 0) {
        throw new AppError("Class is full", 400);
      }
  
      logger.info(`Student (${studentId}) assigned to class: ${classId}`);
    } catch (error) {
      logger.error("Error updating student class", error);
      throw error;
    }
  }
  
}