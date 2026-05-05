import Project from "../models/Project.js";
import Task from "../models/Task.js";
import User from "../models/User.js";

export const createProject = async (req, res) => {
  try {
    const { name, description } = req.body;
    const project = await Project.create({ name, description, owner: req.user._id, members: [] });
    await project.populate("owner", "name email role");
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getProjects = async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";
    const query = isAdmin
      ? {}
      : { $or: [{ owner: req.user._id }, { "members.user": req.user._id }] };

    const projects = await Project.find(query)
      .populate("owner", "name email role")
      .populate("members.user", "name email role")
      .sort({ createdAt: -1 });

    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("owner", "name email role")
      .populate("members.user", "name email role");

    if (!project) return res.status(404).json({ message: "Project not found" });
    if (req.user.role !== "admin" && !project.isMember(req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });
    if (req.user.role !== "admin" && !project.isAdmin(req.user._id)) {
      return res.status(403).json({ message: "Only project admins can update" });
    }
    const { name, description } = req.body;
    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    await project.save();
    await project.populate("owner", "name email role");
    await project.populate("members.user", "name email role");
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });
    if (req.user.role !== "admin" && project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the owner can delete this project" });
    }
    await Task.deleteMany({ project: project._id });
    await project.deleteOne();
    res.json({ message: "Project deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const addMember = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });
    if (req.user.role !== "admin" && !project.isAdmin(req.user._id)) {
      return res.status(403).json({ message: "Only project admins can add members" });
    }

    const { email, role = "member" } = req.body;
    const newUser = await User.findOne({ email });
    if (!newUser) return res.status(404).json({ message: "User not found" });
    if (project.isMember(newUser._id)) {
      return res.status(400).json({ message: "User is already a member" });
    }

    project.members.push({ user: newUser._id, role });
    await project.save();
    await project.populate("owner", "name email role");
    await project.populate("members.user", "name email role");
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const removeMember = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });
    if (req.user.role !== "admin" && !project.isAdmin(req.user._id)) {
      return res.status(403).json({ message: "Only project admins can remove members" });
    }
    if (project.owner.toString() === req.params.userId) {
      return res.status(400).json({ message: "Cannot remove the project owner" });
    }
    project.members = project.members.filter(
      (m) => m.user.toString() !== req.params.userId
    );
    await project.save();
    await project.populate("owner", "name email role");
    await project.populate("members.user", "name email role");
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
