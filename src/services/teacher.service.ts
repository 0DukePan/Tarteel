import { classes, teachers } from "../db/schema";
import { database } from "../config/database";
import { eq , count } from "drizzle-orm";
import { logger } from "../config/logger";
import { ITeacher } from "../types";
import { AppError } from "../middleware/errorHandler";

export class TeacherService {
    private getDb(){
        return database.getDb()
    }
    async getAllTeachers(){
        try {
            const  db = this.getDb()
            const result = await db.select({
                id : teachers.id,
                name : teachers.name,
                email : teachers.email,
                phone : teachers.phone,
                specialization : teachers.specialization,
                createdAt : teachers.createdAt,
                updatedAt : teachers.updatedAt,
                classCount : count(classes.id)
            })
            .from(teachers)
            .leftJoin(classes , eq(teachers.id , classes.teacherId))
            .groupBy(teachers.id)
            .orderBy(teachers.name)
            return result
        } catch (error) {
            logger.info('Error fetching teachers' , error)
            throw error
        }
    }

    async createTeacher(teacherData : Omit<ITeacher , 'id' | 'createdAt' | 'updatedAt'>) : Promise<string> {
        try {
            const db = this.getDb()
            const result = await db.insert(teachers).values(teacherData).returning({id : teachers.id})
            const teacherId = result[0].id
            logger.info(`New teacher created : ${teacherId}`)
            return teacherId
        } catch (error) {
            logger.error('Error creating teacher' , error)
            throw error
        }
    }

    async updateTeacher(teacherId : string , updateData : Partial<ITeacher>) : Promise<void> {
        try {
            const db = this.getDb()

            const existingTeacherResult = await db.select().from(teachers).where(eq(teachers.id , teacherId)).limit(1)
            if(existingTeacherResult.length === 0){
                throw new AppError('Teacher not found' , 404)
            }

            await db.update(teachers).set({
                ...updateData,
                updatedAt : new Date()
            }).where(eq(teachers.id , teacherId))

        } catch (error) {
            logger.error('Error updating teacher' , error)
            throw error
        }
    }

    async deleteTeacher(teacherId: string) : Promise<void> {
        try {
            const db = this.getDb()
            const existingTeacherResult = await db.select().from(teachers).where(eq(teachers.id , teacherId)).limit(1)
            if(existingTeacherResult.length === 0){
                throw new AppError('Teacher not found' , 404)
            }

            //check if teacher has associated classes
            const assignedClassesResult = await db.select().from(classes).where(eq(classes.teacherId , teacherId)).limit(1)
            if(assignedClassesResult.length > 0){
                throw new AppError('Cannot delete teacher with associated classes' , 400)
            }
            await db.delete(teachers).where(eq(teachers.id , teacherId))
            logger.info(`Teacher deleted : ${teacherId}`)
        } catch (error) {
            logger.error('Error deleting teacher' , error)
            throw error
        }
    }

    async getTeacherById(teacherId : string) {
        try {
            const db = this.getDb()
            const result = await db.select({
                id : teachers.id,
                name : teachers.name,
                email : teachers.email,
                phone : teachers.phone,
                specialization : teachers.specialization,
                createdAt : teachers.createdAt,
                updatedAt : teachers.updatedAt,
            }).from(teachers).where(eq(teachers.id , teacherId)).limit(1)
            if(result.length === 0){
                throw new AppError('Teacher not found' , 404)
            }
            return result[0]
        } catch (error) {
            logger.error('Error fetching teacher' , error)
            throw error
        }
    }
}