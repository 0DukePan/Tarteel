
import { asyncHandler } from "../middleware/errorHandler";
import { Request, Response } from "express";
import { RegistrationService } from "../services/registration.service";
import { QueryOptions, RegistrationRequest } from "../types";

export const createRegistration = asyncHandler(async (req: Request, res: Response) => {
  const registrationService = new RegistrationService();
  const registrationData: RegistrationRequest = req.body;

  const result = await registrationService.createRegistration(registrationData);

  res.status(201).json({
    success: true,
    message: "Registration created successfully",
    data: result,
  });
});

export const getRegistrations = asyncHandler(async (req: Request, res: Response) => {
  const registrationService = new RegistrationService();
  const options: QueryOptions = {
    page: Number.parseInt(req.query.page as string) || 1,
    limit: Number.parseInt(req.query.limit as string) || 10,
    sort: (req.query.sort as string) || "-createdAt",
    search: (req.query.search as string) || "",
    status: (req.query.status as string) || "",
    classId: (req.query.classId as string) || "",
  };

  const result = await registrationService.getRegistrations(options);
  res.json(result);
});

export const updateRegistrationStatus = asyncHandler(async (req: Request, res: Response) => {
  const registrationService = new RegistrationService();
  const { studentId } = req.params;
  const { status } = req.body;
  if (!["pending", "approved", "rejected"].includes(status)) {
    return res.status(400).json({
      success: false,
      error: "Invalid Status, Must be pending, approved, or rejected",
    });
  }
  await registrationService.updateRegistrationStatus(studentId, status);
  return res.json({
    success: true,
    message: `Registration ${status} successfully`,
  });
});

export const updateRegistrationClass = asyncHandler(async (req: Request, res: Response) => {
  const registrationService = new RegistrationService()
  const {studentId} = req.params
  const {classId} = req.body
  await registrationService.updateRegistrationClass(studentId , classId || null)
  return res.json({
    success : true,
    message : 'Class assignment updated successfully '
  })
})

export const getRegistrationById = asyncHandler(async (req: Request, res: Response) => {
  const registrationService = new RegistrationService();
  const { studentId } = req.params;
  const registration = await registrationService.getRegistrationById(studentId);
  if (!registration) {
    return res.status(404).json({
      success: false,
      error: "Registration not found",
    });
  }
  return res.json({
    success: true,
    data: registration,
  });
});
