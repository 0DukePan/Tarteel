import { ClassService } from "services/class.service"
import { asyncHandler } from "../middleware/errorHandler"
import { Request , Response } from "express"
export const getAvailableClasses = asyncHandler(async (req : Request , res : Response) => {
    const classService = new ClassService()
    const age = req.query.age ? Number.parseInt(req.query.age as string) : undefined
    const classes = await classService.getAvailableClasses(age)
    res.json({
        success : true ,
        data: classes
    })
})

export const createClass = asyncHandler(async (req : Request , res : Response) => {
    const classService = new ClassService()
    const classId = await classService.createClass(req.body)

    res.status(201).json({
        success : true,
        message : 'Class created successfully',
        data : {classId}
    })
})

export const updateClass = asyncHandler(async (req : Request , res : Response) => {
    const classService = new ClassService() 
    const {classId} = req.params
    await classService.updateClass(classId , req.body)
    res.json({
        success : true,
        message : 'Class updated successfully'
    })
})

export const deleteClass = asyncHandler(async (req : Request , res : Response) => {
    const classService = new ClassService()
    const {classId} = req.params
    await classService.deleteClass(classId)

    res.json({
        success : true,
        message : 'Class deleted successfully'
    })
})

export const getClassById = asyncHandler(async (req : Request , res : Response) => {
    const classService = new ClassService()
    const {classId} = req.params
    const classData = await classService.getClassById(classId)
    res.json({
        success : true,
        data : classData
    })
})
