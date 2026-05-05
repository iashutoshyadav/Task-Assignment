import Task from "../models/Task.js";
import Project from "../models/Project.js";

export const getDashboard = async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";
    const projectQuery = isAdmin
      ? {}
      : { $or: [{ owner: req.user._id }, { "members.user": req.user._id }] };

    const projects = await Project.find(projectQuery).select("_id name");
    const projectIds = projects.map((p) => p._id);

    const taskQuery = isAdmin ? {} : { project: { $in: projectIds } };
    const now = new Date();

    const [total, todo, inProgress, done, overdue, myTasks, recentTasks] = await Promise.all([
      Task.countDocuments(taskQuery),
      Task.countDocuments({ ...taskQuery, status: "todo" }),
      Task.countDocuments({ ...taskQuery, status: "in_progress" }),
      Task.countDocuments({ ...taskQuery, status: "done" }),
      Task.countDocuments({ ...taskQuery, status: { $ne: "done" }, dueDate: { $lt: now } }),
      Task.countDocuments({ assignee: req.user._id }),
      Task.find(taskQuery)
        .sort({ updatedAt: -1 })
        .limit(5)
        .populate("assignee", "name")
        .populate("project", "name"),
    ]);

    res.json({
      stats: { total, todo, inProgress, done, overdue, projects: projects.length, myTasks },
      recentTasks,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
