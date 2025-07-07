import { and, eq, gte, lte } from "drizzle-orm";
import { database } from "../config/database";
import { classes, teachers } from "db/schema";
import { logger } from "config/logger";
import { AppError } from "middleware/errorHandler";
import { IClass } from "../types";

export class ClassService {
    private getDb(){
        return database.getDb() // get connection when needed
    }

    async getAvailableClasses(age ?: number){
        try {
            const db = this.getDb()
            let baseQuery = db.select({
                id : classes.id ,
                name : classes.name ,
                startTime : classes.startTime,
                endTime : classes.endTime,
                ageMin : classes.ageMin,
                ageMax : classes.ageMax,
                teacherId  : classes.teacherId,
                maxStudents : classes.maxStudents,
                currentStudents : classes.currentStudents,
                createdAt : classes.createdAt,
                updatedAt : classes.updatedAt,
                teacher :{
                    id : teachers.id,
                    name : teachers.name,
                    email : teachers.email,
                    phone : teachers.phone,
                    specialization : teachers.specialization
                }
            }).from(classes).leftJoin(teachers , eq(classes.teacherId , teachers.id))
            let result 
            if(age !== undefined){
                result = await  baseQuery.where(and (lte(classes.ageMin , age) , gte(classes.ageMax , age))) // classes.ageMin <= age && classes.ageMax >= age
            }else {
                result = await baseQuery.orderBy(classes.startTime)
            }
            return result.map((cls) => ({
                ...cls,
                availableSpots : cls.maxStudents - cls.currentStudents,
                isFull : cls.currentStudents >= cls.maxStudents
            }))
        } catch (error) {
            logger.error('Error fetching available classes' , error)
            throw error
        }
    }
    async createClass(classData : Omit<IClass , 'id' | 'currentStudents' | 'createdAt' | 'updatedAt'>) : Promise<string> {
        try {
            const db = this.getDb()
            //validate teacher exists if provided
            if(classData.teacherId){
                const teacherResult = await db.select().from(teachers).where(eq(teachers.id , classData.teacherId)).limit(1)
                if(teacherResult.length === 0){
                    throw new AppError('Teacher not found' , 404)
                }
            }
            const result = await db.insert(classes).values({
                ...classData,
                currentStudents : 0
            }).returning({id : classes.id})
            const classId = result[0].id
            logger.info(`New class created : ${classId}`)
            return classId
        } catch (error) {
            logger.error('Error creating class' , error)
            throw error
        }
    }

    async updateClass(classId : string , updateData : Partial<IClass>) : Promise<void>{
        try {
            const db = this.getDb()
            const existingClassResult = await db.select().from(classes).where(eq(classes.id , classId)).limit(1)

            if(existingClassResult.length === 0){
                throw new AppError('Class not found' , 404)
            }

            //validate teacher exists if provided
            if(updateData.teacherId){
                const teacherResult = await db.select().from(teachers).where(eq(teachers.id , updateData.teacherId)).limit(1)
                if(teacherResult.length === 0){
                    throw new AppError('Teacher not found' , 404)
                } 
            }

            await db.update(classes).set({
                ...updateData,
                updatedAt : new Date()
            }).where(eq(classes.id , classId))

            logger.info(`Class updated : ${classId}`)
        } catch (error) {
            logger.error('Error updating class' , error)
            throw error
        }
    }

    async deleteClass (classId : string) : Promise<void> {
        try {
            const db = this.getDb()
            const existingClassResult = await db.select().from(classes).where(eq(classes.id , classId)).limit(1)
            if(existingClassResult.length === 0){
                throw new AppError('Class not found' , 404)
            }
            const existingResult = existingClassResult[0]
            if(existingResult.currentStudents > 0){
                throw new AppError('Cannot delete class with enrolled students' , 400)
            }
            await db.delete(classes).where(eq(classes.id , classId))
            logger.info(`Class deleted : ${classId}`)
        } catch (error) {
            logger.error('Error deleting class' , error)
            throw error
        }
    }

    async getClassById (classId : string){
        try {
            const db = this.getDb()
            const result = await db.select({
                id : classes.id ,
                name : classes.name ,
                startTime : classes.startTime,
                endTime : classes.endTime,
                ageMin : classes.ageMin,
                ageMax : classes.ageMax,
                teacherId  : classes.teacherId,
                maxStudents : classes.maxStudents,
                currentStudents : classes.currentStudents,
                createdAt : classes.createdAt,
                updatedAt : classes.updatedAt,
                teacher :{
                    id : teachers.id,
                    name : teachers.name,
                    email : teachers.email,
                    phone : teachers.phone,
                    specialization : teachers.specialization
                }
            })
              .from(classes).leftJoin(teachers , eq(classes.teacherId , teachers.id))
              .where(eq(classes.id , classId))
              .limit(1)

              if(result.length === 0){
                  throw new AppError('Class not found' , 404)
              }
              const classData = result[0]
              return{
                ...classData,
                availableSpots : classData.maxStudents - classData.currentStudents,
                isFull : classData.currentStudents >= classData.maxStudents
              }
        } catch (error) {
            logger.error('Error fetching class' , error)
            throw error
        }
    }
    
}