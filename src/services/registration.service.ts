import { classes, parents, students, teachers } from "../db/schema";
import { database } from "../config/database";
import { RegistrationRequest , QueryOptions, PaginatedResponse, RegistrationWithDetails} from "../types";
import { eq, ilike, or , count, asc, and, desc, sql } from "drizzle-orm";
import { AppError } from "../middleware/errorHandler";
import { logger } from "../config/logger";


export class RegistrationService {
    private getDb(){
        return database.getDb()
    }

   
    async createRegistration(registrationData : RegistrationRequest ) : Promise<{parentId : string , studentId : string}> {
        try {
            const db = this.getDb()
            const {parent : parentData , student : studentData} = registrationData

            //check if class exists and has available spots
            const selectedClassResult = await db.select().from(classes).where(eq(classes.id , studentData.classId!)).limit(1)
            
            const selectedClass = selectedClassResult[0]
            if(!selectedClass){
                throw new AppError('Selected class is not found' , 404)
            }
            
            //calculate age 
            const today = new Date()
            const birthDate = new Date(studentData.dateOfBirth)
            let age = today.getFullYear() - birthDate.getFullYear()
            const monthDiff = today.getMonth() - birthDate.getMonth()

            if(monthDiff < 0 || (monthDiff === 0 && today.getDate() && today.getDate() < birthDate.getDate())){
                age --
            }

            // check if student age is appropiate for the class 
            if (age < selectedClass.ageMin || age > selectedClass.ageMax){
                throw new AppError(`Student age (${age}) is not appropiate for the class`, 400)
            }

            //check  if parent alredy exists 
            const existingParentResult = await db.select().from(parents).where(eq(parents.fatherEmail , parentData.fatherEmail)).limit(1)
            let parentId: string

            if(existingParentResult.length > 0){
                //Update existing parent 
                parentId = existingParentResult[0].id
                await db.update(parents).set({
                    ...parentData,
                    updatedAt : new Date()
                }).where(eq(parents.id , parentId))
            }else {
                //create student 
                const newParentResult = await db.insert(parents).values(parentData).returning({id : parents.id})
                parentId = newParentResult[0].id
            }

            //create student
            const newStudentResult = await db.insert(students).values({
                ...studentData,
                parentId,
                age,
                registrationStatus: 'pending',
                dateOfBirth: studentData.dateOfBirth.toISOString().split('T')[0], 
              }).returning({ id: students.id });
              

            const studentId = newStudentResult[0].id
            logger.info(`New registration created - Student : ${studentId} , Parent : ${parentId}`)
            return {parentId , studentId}
        } catch (error) {
            logger.error('Error creating registration' , error)
            throw error
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
      
          // Build filtering conditions
          const conditions = [];
      
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
          const countQuery = db
            .select({ count: count() })
            .from(students)
            .innerJoin(parents, eq(students.parentId, parents.id));
      
          const totalResult =
            conditions.length > 0
              ? await countQuery.where(and(...conditions))
              : await countQuery;
      
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
      
          // Final query (chained in one go to preserve type)
          const registrations = await db
            .select({
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
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(sortOrder)
            .limit(limit)
            .offset(offset);
      
          return {
            success: true,
            data: registrations as RegistrationWithDetails[],
            pagination: {
              page,
              limit,
              total,
              pages: Math.ceil(total / limit),
            },
          }
        } catch (error) {
          logger.error("Error fetching registrations:", error);
          throw error
        }
      }

      async updateRegistrationStatus(studentId : string , status : 'pending' | 'approved' | 'rejected') : Promise<void> {
          try {
            const db = this.getDb()

            //get current student data 
            const studentResult = await db.select().from(students).where(eq (students.id , studentId)).limit(1)
            const student = studentResult[0]

            if(!student){
                throw new AppError('Student not found' , 404)
            }
            const oldStatus = student.registrationStatus
            //update student status 
            await db.update(students).set({
                registrationStatus : status,
                updatedAt : new Date()
            }).where(eq(students.id , studentId))

            //update class current students count 
            if(student.classId){
                if(status === 'approved' && oldStatus !== 'approved'){
                    await db.update(classes).set({
                        currentStudents : sql`${classes.currentStudents} + 1`,
                        updatedAt : new Date()
                    }).where(eq(classes.id , student.classId))
                }else if (status !== 'approved' && oldStatus === 'approved'){
                    await db.update(classes).set({
                        currentStudents : sql`${classes.currentStudents} - 1`,
                        updatedAt : new Date()
                    }).where(eq(classes.id , student.classId))
                }
            }
            logger.info(`Registration status updated - Student: ${studentId} , Status: ${status}`)
          } catch (error) {
            logger.error('Error updating registration status' , error)
            throw error
          }
      }

      async getRegistrationById(studentId : string) : Promise<RegistrationWithDetails | null> {
        try {
            const db = this.getDb()
            const result =  await db
            .select({
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
            }).from(students)
            .innerJoin(parents, eq(students.parentId, parents.id))
            .leftJoin(classes, eq(students.classId, classes.id))
            .leftJoin(teachers, eq(classes.teacherId, teachers.id))
            .where(eq(students.id , studentId))
            .limit(1)

            return (result[0] as RegistrationWithDetails || null)
        } catch (error) {
            logger.error('Error fetching registration by id' , error)
            throw error
        }
      }
      
}