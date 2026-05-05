import Task from "../models/Task.js";
import Project from "../models/Project.js";

const populateTask = (query) =>
  query
    .populate("assignee", "name email")
    .populate("createdBy", "name email");

export const getTasks = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });
    if (req.user.role !== "admin" && !project.isMember(req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }
    const filter = { project: project._id };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.assignee) filter.assignee = req.query.assignee;

    const tasks = await populateTask(Task.find(filter)).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createTask = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });
    if (req.user.role !== "admin" && !project.isMember(req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { title, description, assignee, status, priority, dueDate } = req.body;

    // Only project admins / global admin can assign tasks to members
    if (assignee && req.user.role !== "admin" && !project.isAdmin(req.user._id)) {
      return res.status(403).json({ message: "Only admins can assign tasks to members" });
    }

    const task = await Task.create({
      title,
      description,
      project: project._id,
      assignee: assignee || null,
      createdBy: req.user._id,
      status,
      priority,
      dueDate: dueDate || null,
    });
    const populated = await populateTask(Task.findById(task._id));
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateTask = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });
    if (req.user.role !== "admin" && !project.isMember(req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }
    const task = await Task.findOne({ _id: req.params.taskId, project: project._id });
    if (!task) return res.status(404).json({ message: "Task not found" });

    // Only project admins / global admin can change the assignee
    if ("assignee" in req.body && req.user.role !== "admin" && !project.isAdmin(req.user._id)) {
      return res.status(403).json({ message: "Only admins can assign tasks to members" });
    }

    const fields = ["title", "description", "assignee", "status", "priority", "dueDate"];
    fields.forEach((f) => { if (req.body[f] !== undefined) task[f] = req.body[f]; });
    if (req.body.assignee === null) task.assignee = null;

    await task.save();
    const populated = await populateTask(Task.findById(task._id));
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteTask = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });
    if (req.user.role !== "admin" && !project.isAdmin(req.user._id)) {
      return res.status(403).json({ message: "Only project admins can delete tasks" });
    }
    const task = await Task.findOneAndDelete({ _id: req.params.taskId, project: project._id });
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json({ message: "Task deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
