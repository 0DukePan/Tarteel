import { authenticate } from '../middleware/auth'
import { getProfile, login, updateProfile } from '../controllers/auth.controller'
import express from 'express'
import { loginValidation, validate } from '../middleware/validation'

const router = express.Router()

router.post('/login' , validate(loginValidation),login)

router.use(authenticate)
router.get('/profile' , getProfile)
router.put('/profile' , updateProfile)

export default router