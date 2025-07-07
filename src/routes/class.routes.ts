import { authenticate, authorize } from '../middleware/auth'
import { createClass, deleteClass, getAvailableClasses, getClassById, updateClass } from '../controllers/class.controller'
import express from 'express'
import { classValidation, validate } from '../middleware/validation'

const router = express.Router()


router.get('/' , getAvailableClasses)
router.get('/:classId' , getClassById)

router.use(authenticate)
router.post('/' , authorize('admin' , 'super_admin') , validate(classValidation) , createClass)
router.put('/:classId' , authorize('admin' , 'super_admin') , validate(classValidation) , updateClass)
router.delete('/:classId' , authorize('admin' , 'super_admin') , deleteClass)

export default router