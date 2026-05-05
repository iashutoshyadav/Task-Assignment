import { Router } from "express";
import { body } from "express-validator";
import {
  createProject, getProjects, getProject,
  updateProject, deleteProject, addMember, removeMember,
} from "../controllers/projectController.js";
import { protect } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import taskRouter from "./tasks.js";

const router = Router();

router.use(protect);
router.use("/:projectId/tasks", taskRouter);

router.get("/", getProjects);
router.post(
  "/",
  [body("name").trim().notEmpty().withMessage("Project name is required")],
  validate,
  createProject
);
router.get("/:id", getProject);
router.put("/:id", updateProject);
router.delete("/:id", deleteProject);
router.post("/:id/members", addMember);
router.delete("/:id/members/:userId", removeMember);

export default router;
