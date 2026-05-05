import { Router } from "express";
import { body } from "express-validator";
import { getTasks, createTask, updateTask, deleteTask } from "../controllers/taskController.js";
import { validate } from "../middleware/validate.js";

const router = Router({ mergeParams: true });

router.get("/", getTasks);
router.post(
  "/",
  [body("title").trim().notEmpty().withMessage("Title is required")],
  validate,
  createTask
);
router.put("/:taskId", updateTask);
router.delete("/:taskId", deleteTask);

export default router;
