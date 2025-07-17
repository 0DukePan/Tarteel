import express from "express";
import { registrationValidation, validate } from "../middleware/validation";
import { createRegistration, getRegistrationById, getRegistrations, updateRegistrationClass, updateRegistrationStatus } from "../controllers/registration.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = express.Router();

router.post("/", validate(registrationValidation), createRegistration);

// Admin routes
router.use(authenticate);
router.get("/", authorize("admin", "super_admin"), getRegistrations);
router.get("/:studentId", authorize("admin", "super_admin"), getRegistrationById);
router.patch("/:studentId/status", authorize("admin", "super_admin"), updateRegistrationStatus);
router.patch("/:studentId/class", authorize("admin", "super_admin"), updateRegistrationClass);

export default router;