import express from 'express'
import { registrationValidation, validate } from '../middleware/validation'
import { createRegistration, getRegistrationById, getRegistrations, updateRegistrationStatus } from '../controllers/registration.controller'
import { authenticate, authorize } from 'middleware/auth'

const router = express.Router()

router.post('/' , validate(registrationValidation) , createRegistration)

//admin routes

router.use(authenticate)
router.get('/' , authorize('admin' , 'super_admin') , getRegistrations)
router.get('/:studentId' , authorize('admin' , 'super_admin') , getRegistrationById)
router.patch('/:studentId/status' , authorize('admin' , 'super_admin') , updateRegistrationStatus)

export default router