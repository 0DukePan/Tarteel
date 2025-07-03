import { pgTable , uuid , varchar , text , integer , timestamp , boolean , time, date } from 'drizzle-orm/pg-core'
import {relations} from 'drizzle-orm'
import { create } from 'domain'

export const parents = pgTable("parents" , {
    id : uuid('id').primaryKey().defaultRandom(),
    fatherFirstName : varchar('father_firsr_name' , {length : 100}).notNull(),
    fatherLastName : varchar('father_last_name' , {length : 100}).notNull(),
    fatherPhone : varchar("father_phone" , {length : 20}).notNull(),
    fatherEmail : varchar("father_email" , {length : 255}).notNull().unique(),
    motherFirstName : varchar('mother_first_name' , {length : 100}),
    motherLastName : varchar('mother_last_name' , {length : 100}),
    motherPhone : varchar("mother_phone" , {length : 20}),
    motherEmail : varchar("mother_email" , {length : 255}).unique(),
    createdAt : timestamp('created_at').defaultNow().notNull(),
    updatedAt : timestamp('updated_at').defaultNow().notNull(),
})

//teachers table 
export const teachers = pgTable('teachers' , {
    id : uuid('id').primaryKey().defaultRandom(),
    name : varchar('name' , {length : 200}).notNull(),
    email : varchar('email' , {length : 255}).notNull().unique(),
    phone : varchar('phone' , {length : 20}).notNull(),
    specialization : varchar('specialization' , {length : 255}).notNull(),
    createdAt : timestamp('created_at').defaultNow().notNull(),
    updatedAt : timestamp('updated_at').defaultNow().notNull(),
})

//classed table
export const classes = pgTable('classes' , {
    id : uuid('id').primaryKey().defaultRandom(),
    name : varchar('name' , {length: 200}).notNull(),
    startTime : time('start_time').notNull(),
    endTime : time('end_time').notNull(),
    ageMin : integer('age_min').notNull(),
    ageMax : integer('age_max').notNull(),
    teacherId : uuid('teacher_id').references(() => teachers.id),
    maxStudents : integer('max_students').notNull().default(20),
    currentStudents : integer('cuurent_students').notNull().default(0),
    createdAt : timestamp('created_at').defaultNow().notNull(),
    updatedAt : timestamp('updated_at').defaultNow().notNull(),
})

//studens table 
export const students = pgTable('students' , {
    id : uuid('id').primaryKey().defaultRandom(),
    parentId : uuid('parent_id').references(()=> parents.id , {onDelete : 'cascade'}).notNull(),
    firstName : varchar('first_name' , {length : 100}).notNull(),
    lastName : varchar('last_name' , {length : 100}).notNull(),
    dateOfBirth : date('date_of_birth').notNull(),
    age : integer('age').notNull(),
    classId : uuid('class_id').references(() => classes.id),
    registrationStatus : varchar('registration_status' , {length : 20}).notNull().default('pending'),
    createdAt : timestamp('created_at').defaultNow().notNull(),
    updatedAt : timestamp('updated_at').defaultNow().notNull(),
})

//admin table 
export const admins = pgTable('admins' , {
    id : uuid('id').primaryKey().defaultRandom(),
    username : varchar('username' , {length : 50}).notNull().unique(),
    email : varchar('email' , {length : 255}).notNull().unique(),
    password : varchar('password' , {length : 255}).notNull(),
    role : varchar('role' , {length : 20}).notNull().default('admin'), 
    isActive : boolean('is_active').notNull().default(true),
    createdAt : timestamp('created_at').defaultNow().notNull(),
    updatedAt : timestamp('updated_at').defaultNow().notNull(),
})

// //relations 
// export const  parentsRelations = relations(parents , ({many})) => ({
//     students : many(students),
// })

// export const teachersRelations = relations(teachers , ({many})) => ({
//     classes : many(classes),
// })

// export const classesRelations = relations(classes , ({one , many})) => ({
//     teacher : one(teachers, {
//         fields : [classes.teacherId],
//         references : [teachers.id]
//     }),
//     students: many(students)
// })

// export const studentsRelations = relations(students , ({one , many}) => ({
//     parent : one(parents , {
//         fields : [students.parentId],
//         references : [parents.id]
//     }),
//     class : one(classes , {
//         fields : [students.classId],
//         references : [classes.id]
//     })
// }))
