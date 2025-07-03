import { eq } from "drizzle-orm";
import { database } from "../config/database";
import { classes, teachers } from "db/schema";

export class ClassService {
    private getDb(){
        return database.getDb() // get connection when needed
    }

    async getAvailableClasses(age ?: number){
        const db = this.getDb()
        let query = db.select({
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
    }
}