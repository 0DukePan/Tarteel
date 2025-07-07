import { authenticate, authorize } from '../middleware/auth'
import { createTeacher, deleteTeacher, getAllTeachers, getTeacherById, updateTeacher } from '../controllers/teacher.controller'
import express from 'express'
import { teacherValidation, validate } from '../middleware/validation'

const router = express.Router()


router.get('/' , getAllTeachers)
router.get('/:teacherId' , getTeacherById)

//protected admin routes
router.use(authenticate)
router.post('/' , authorize('admin' , 'super_admin') , validate(teacherValidation) , createTeacher)
router.put('/:teacherId' , authorize('admin' , 'super_admin') , validate(teacherValidation) , updateTeacher )

router.delete('/:teacherId' , authorize('admin' , 'super_admin') , deleteTeacher)

export default router