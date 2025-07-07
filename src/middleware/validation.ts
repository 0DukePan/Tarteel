import { Request , Response , NextFunction } from "express";
import {body , validationResult , type ValidationChain} from 'express-validator'

export const validate = (validations: ValidationChain[]) => {
    return async (req: Request, res: Response, next: NextFunction)  : Promise<void> => {
      // Run all validations
      await Promise.all(validations.map((validation) => validation.run(req)))
  
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        const errorMessages: Record<string, string> = {}
        errors.array().forEach((error) => {
          if (error.type === "field") {
            errorMessages[error.path] = error.msg
          }
        })
  
         res.status(400).json({
          success: false,
          error: "Validation failed",
          errors: errorMessages,
        })
        return 
      }
  
      next()
    }
}

export const registrationValidation = [
    body('parent.fatherFirstName').trim().isLength({min : 2 , max : 50}).withMessage('Father first name must be between 2 and 50 characters'),
    body('parent.fatherLastName').trim().isLength({min : 2 , max : 50}).withMessage('Father last name must be between 2 and 50 characters'),
    body('parent.fatherPhone').trim().matches(/^[+]?[1-9][\d]{0,15}$/).withMessage('Please enter a valid phone number'),
    body('parent.fatherEmail').trim().isEmail().normalizeEmail().withMessage('Please enter a valid email address'),
    body('parent.motherFirstName').optional().trim().isLength({max : 20}).withMessage('Mother first name cannot exceed 20 characters'),
    body('parent.motherLastName').optional().trim().isLength({max : 50}).withMessage('Mother last name cannot exceed 50 characters'),
    body('parent.motherPhone').optional().trim().matches(/^[+]?[1-9][\d]{0,15}$/).withMessage('Please enter a valid phone number'),
    body('parent.motherEmail').optional().trim().isEmail().normalizeEmail().withMessage('Please enter a valid email address'),
    //student validation
    body('student.firstName').trim().isLength({min : 2 ,max : 50}).withMessage('student first name must be between 2 and 50 characters'),
    body('student.lastName').trim().isLength({min : 2 ,max : 50}).withMessage('student last name must be between 2 and 50 characters'),
    body('student.dateOfBirth').isISO8601().withMessage('Please enter a valid date of birth').custom((value) => {
        const today = new Date()
        const birthDate = new Date(value)
        const fiveYearsAgo = new Date(today.getFullYear() - 5 , today.getMonth() , today.getDate() ) 
        const  fourteenYearsAgo = new Date(today.getFullYear() - 14 , today.getMonth() , today.getDate())
        if(birthDate > fiveYearsAgo || birthDate < fourteenYearsAgo){
            throw new Error('Student must be between 5 and 14 years old')
        }
        return true
    }),
    body('stundent.classId').isUUID().withMessage('Please select a valid class')
]

//admin login validation
export const loginValidation = [
    body('email').trim().isEmail().normalizeEmail().withMessage('Please enter a valid email address'),
    body('password').isLength({min : 6}).withMessage('Password must be at least 6 characters')
]
//class validation 
export const classValidation = [
    body('name').trim().isLength({min : 2 , max : 100}).withMessage('Class name must be between 2 and 100 characters'),
    body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Please enter a valid  start time (HH:MM)'),
    body('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Please enter a valid  end time (HH:MM)'),
    body('ageMin').isInt({min : 5 , max : 14}).withMessage('Minimum age must be between 5 and 14'),
    body('ageMax').isInt({min : 5 , max : 14}).withMessage('Maximum age must be between 5 and 14'),
    body('maxStudents').isInt({min : 1 , max : 20}).withMessage('Maximum number of students must be between 1 and 20'),
    body('teacherId').optional().isUUID().withMessage('Please select a valid teacher')
]

//Teacher validation
export const teacherValidation = [
    body('name').trim().isLength({min: 2 , max : 100}).withMessage('Teacher name must be between 2 and 100 characters'),
    body('email').trim().isEmail().normalizeEmail().withMessage('Please enter a valid email address'),
    body('phone').trim().matches(/^[+]?[1-9][\d]{0,15}$/).withMessage('Please enter a valid phone number'),
    body('specialization').optional().trim().isLength({max : 200}).withMessage('Specialization cannot exceed 200 characters')
]



