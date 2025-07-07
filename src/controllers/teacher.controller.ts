import { asyncHandler } from "../middleware/errorHandler"
import { TeacherService } from "../services/teacher.service"
import { Request , Response } from "express"


export const getAllTeachers = asyncHandler(async (req : Request , res : Response) => {
    const teacherService = new TeacherService() 
    const teachers = await teacherService.getAllTeachers()
    res.json({
        success : true,
        data : teachers
    })
})

export const createTeacher = asyncHandler(async (req : Request , res : Response) => {
    const teacherServcie  = new TeacherService()
    const  teacherId = await teacherServcie.createTeacher(req.body)

    res.status(201).json({
        success : true,
        message : 'Teacher created successfully',
        data : {teacherId}
    })
})

export const updateTeacher = asyncHandler(async (req : Request , res : Response) => {
    const teacherService = new TeacherService()
    const {teacherId} = req.params
     await teacherService.updateTeacher(teacherId , req.body)
    res.json({
        success : true,
        message : 'Teacher updated successfully'
    })
})

export const deleteTeacher = asyncHandler(async (req : Request , res : Response) => {
    const teacherService = new TeacherService()
    const {teacherId} = req.params
    await teacherService.deleteTeacher(teacherId)
    res.json({
        success : true,
        message : 'Teacher deleted successfully'
    })

})

export const getTeacherById = asyncHandler(async (req : Request , res : Response) => {
        const teacherService = new TeacherService()
        const  {teacherId} = req.params
        const teacher = await teacherService.getTeacherById(teacherId)
        res.json({
            success : true,
            data : teacher
        })
})