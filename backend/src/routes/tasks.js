import { Router } from "express";
import { body } from "express-validator";
import { getTasks, createTask, updateTask, deleteTask } from "../controllers/taskController.js";
import { validate } from "../middleware/validate.js";

const router = Router({ mergeParams: true });

router.get("/", getTasks);

router.post(
  "/",
  [
    body("title").trim().notEmpty().withMessage("Title is required"),
    body("status").optional().isIn(["todo", "in_progress", "done"]).withMessage("Invalid status"),
    body("priority").optional().isIn(["low", "medium", "high"]).withMessage("Invalid priority"),
    body("dueDate").optional({ nullable: true }).isISO8601().withMessage("Invalid date format"),
  ],
  validate,
  createTask
);

router.put(
  "/:taskId",
  [
    body("title").optional().trim().notEmpty().withMessage("Title cannot be empty"),
    body("status").optional().isIn(["todo", "in_progress", "done"]).withMessage("Invalid status"),
    body("priority").optional().isIn(["low", "medium", "high"]).withMessage("Invalid priority"),
    body("dueDate").optional({ nullable: true }).isISO8601().withMessage("Invalid date format"),
  ],
  validate,
  updateTask
);

router.delete("/:taskId", deleteTask);

export default router;
