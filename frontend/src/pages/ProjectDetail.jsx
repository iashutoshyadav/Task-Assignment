import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import toast from "react-hot-toast";
import {
  Plus, X, Trash2, UserPlus, ChevronLeft, Calendar, Flag,
  CheckCircle2, Circle, Clock, MoreVertical, Users, Zap,
} from "lucide-react";
import { format, isPast } from "date-fns";

const STATUSES = [
  { value: "todo",        label: "To Do",       icon: Circle,       cls: "bg-slate-100 text-slate-600",    dot: "bg-slate-400" },
  { value: "in_progress", label: "In Progress", icon: Clock,        cls: "bg-blue-100 text-blue-700",      dot: "bg-blue-500" },
  { value: "done",        label: "Done",        icon: CheckCircle2, cls: "bg-emerald-100 text-emerald-700",dot: "bg-emerald-500" },
];

const PRIORITY = {
  low:    { cls: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-400" },
  medium: { cls: "bg-amber-100 text-amber-700",    dot: "bg-amber-400" },
  high:   { cls: "bg-red-100 text-red-700",        dot: "bg-red-500" },
};

const STATUS_NEXT = { todo: "in_progress", in_progress: "done", done: "todo" };

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const socketRef = useSocket();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskForm, setTaskForm] = useState(emptyTask());
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("member");
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [openMenu, setOpenMenu] = useState(null);

  function emptyTask() {
    return { title: "", description: "", assignee: "", status: "todo", priority: "medium", dueDate: "" };
  }

  const fetchData = async () => {
    try {
      const [pRes, tRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/projects/${id}/tasks`),
      ]);
      setProject(pRes.data);
      setTasks(tRes.data);
    } catch { toast.error("Failed to load project"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [id]);

  // Real-time socket listeners
  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket || !id) return;

    socket.emit("join:project", id);

    socket.on("task:created", (task) => {
      setTasks((prev) => prev.some((t) => t._id === task._id) ? prev : [task, ...prev]);
      toast.success(`New task added: "${task.title}"`, { icon: "✅" });
    });

    socket.on("task:updated", (task) => {
      setTasks((prev) => prev.map((t) => t._id === task._id ? task : t));
    });

    socket.on("task:deleted", ({ taskId }) => {
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
      toast("A task was removed", { icon: "🗑️" });
    });

    socket.on("project:updated", (updated) => {
      setProject(updated);
    });

    return () => {
      socket.emit("leave:project", id);
      socket.off("task:created");
      socket.off("task:updated");
      socket.off("task:deleted");
      socket.off("project:updated");
    };
  }, [socketRef, id]);

  const allMembers = project
    ? [{ user: project.owner, role: "owner" }, ...(project.members || [])]
    : [];

  const isProjectAdmin =
    user.role === "admin" ||
    project?.owner?._id === user._id ||
    project?.members?.some((m) => m.user._id === user._id && m.role === "admin");

  const openCreate = () => { setEditingTask(null); setTaskForm(emptyTask()); setShowTaskModal(true); };
  const openEdit = (task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title, description: task.description || "",
      assignee: task.assignee?._id || "", status: task.status,
      priority: task.priority, dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
    });
    setShowTaskModal(true);
    setOpenMenu(null);
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true);
    const body = { ...taskForm, dueDate: taskForm.dueDate || null };
    // Non-admins cannot send assignee — strip it to avoid 403
    if (!isProjectAdmin) delete body.assignee;
    else body.assignee = taskForm.assignee || null;
    try {
      if (editingTask) {
        const { data } = await api.put(`/projects/${id}/tasks/${editingTask._id}`, body);
        setTasks((p) => p.map((t) => t._id === data._id ? data : t));
        toast.success("Task updated");
      } else {
        const { data } = await api.post(`/projects/${id}/tasks`, body);
        setTasks((p) => [data, ...p]);
        toast.success("Task created");
      }
      setShowTaskModal(false);
    } catch (err) { toast.error(err.response?.data?.message || "Failed"); }
    finally { setSubmitting(false); }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm("Delete this task?")) return;
    setOpenMenu(null);
    try {
      await api.delete(`/projects/${id}/tasks/${taskId}`);
      setTasks((p) => p.filter((t) => t._id !== taskId));
      toast.success("Task deleted");
    } catch { toast.error("Failed to delete task"); }
  };

  const cycleStatus = async (task) => {
    try {
      const { data } = await api.put(`/projects/${id}/tasks/${task._id}`, { status: STATUS_NEXT[task.status] });
      setTasks((p) => p.map((t) => t._id === data._id ? data : t));
    } catch { toast.error("Failed to update"); }
  };

  const handleAddMember = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      const { data } = await api.post(`/projects/${id}/members`, { email: memberEmail, role: memberRole });
      setProject(data); setMemberEmail(""); setShowMemberModal(false);
      toast.success("Member added");
    } catch (err) { toast.error(err.response?.data?.message || "Failed"); }
    finally { setSubmitting(false); }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm("Remove this member?")) return;
    try {
      const { data } = await api.delete(`/projects/${id}/members/${userId}`);
      setProject(data); toast.success("Member removed");
    } catch { toast.error("Failed to remove member"); }
  };

  const filteredTasks = filterStatus === "all" ? tasks : tasks.filter((t) => t.status === filterStatus);
  const counts = { all: tasks.length, todo: 0, in_progress: 0, done: 0 };
  tasks.forEach((t) => counts[t.status]++);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-[3px] border-violet-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!project) return <div className="text-center py-20 text-slate-400">Project not found.</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Breadcrumb + header */}
      <div>
        <Link to="/projects" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-violet-600 font-medium mb-4 transition-colors">
          <ChevronLeft size={15} /> Projects
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-sm shadow-violet-200">
              <Zap size={22} className="text-white" />
            </div>
            <div>
              <h1 className="page-title">{project.name}</h1>
              {project.description && <p className="page-subtitle mt-0.5">{project.description}</p>}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {isProjectAdmin && (
              <button onClick={() => setShowMemberModal(true)} className="btn-secondary">
                <UserPlus size={15} /> Members
              </button>
            )}
            <button onClick={openCreate} className="btn-primary">
              <Plus size={15} /> Add Task
            </button>
          </div>
        </div>
      </div>

      {/* Team avatars */}
      <div className="card px-5 py-3.5 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-widest">
          <Users size={13} /> Team
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {allMembers.map(({ user: u, role }) => {
            const colors = ["bg-violet-500","bg-indigo-500","bg-pink-500","bg-emerald-500","bg-amber-500"];
            const bg = colors[(u.name?.charCodeAt(0) || 0) % colors.length];
            return (
              <div key={u._id} className="flex items-center gap-1.5 group">
                <div className="relative">
                  <div className={`w-8 h-8 rounded-full ${bg} flex items-center justify-center`}>
                    <span className="text-white text-xs font-bold">{u.name?.[0]?.toUpperCase()}</span>
                  </div>
                  {role === "owner" && (
                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-amber-400 rounded-full border-2 border-white" />
                  )}
                </div>
                <div className="text-xs">
                  <span className="font-semibold text-slate-700">{u.name}</span>
                  <span className="text-slate-400 ml-1 capitalize">({role})</span>
                </div>
                {isProjectAdmin && role !== "owner" && (
                  <button onClick={() => handleRemoveMember(u._id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all ml-0.5">
                    <X size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: "All Tasks" },
          { key: "todo", label: "To Do" },
          { key: "in_progress", label: "In Progress" },
          { key: "done", label: "Done" },
        ].map(({ key, label }) => {
          const active = filterStatus === key;
          const st = STATUSES.find((s) => s.value === key);
          return (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150
                ${active ? "bg-violet-600 text-white shadow-sm shadow-violet-200" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"}`}
            >
              {st && <div className={`w-2 h-2 rounded-full ${active ? "bg-white/60" : st.dot}`} />}
              {label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold
                ${active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400"}`}>
                {counts[key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tasks */}
      {filteredTasks.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={28} className="text-violet-300" />
          </div>
          <p className="font-bold text-slate-700">No tasks here</p>
          <p className="text-slate-400 text-sm mt-1">
            {filterStatus === "all" ? "Add your first task to get started." : `No ${filterStatus.replace("_", " ")} tasks.`}
          </p>
          {filterStatus === "all" && (
            <button onClick={openCreate} className="btn-primary mt-5 mx-auto">
              <Plus size={15} /> Add Task
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => {
            const st = STATUSES.find((s) => s.value === task.status);
            const StIcon = st?.icon || Circle;
            const overdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== "done";
            return (
              <div
                key={task._id}
                className="card px-5 py-4 flex items-start gap-4 group hover:shadow-md hover:border-slate-200 transition-all duration-200"
              >
                {/* Cycle status button */}
                <button
                  onClick={() => cycleStatus(task)}
                  title="Click to cycle status"
                  className={`mt-0.5 shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110 ${st?.cls}`}
                >
                  <StIcon size={14} />
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEdit(task)}>
                  <p className={`font-semibold text-sm leading-snug ${task.status === "done" ? "text-slate-400 line-through" : "text-slate-900"}`}>
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{task.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`badge ${PRIORITY[task.priority]?.cls}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${PRIORITY[task.priority]?.dot}`} />
                      {task.priority}
                    </span>
                    {task.assignee && (
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                        → {task.assignee.name}
                      </span>
                    )}
                    {task.dueDate && (
                      <span className={`text-xs flex items-center gap-1 px-2 py-0.5 rounded-full font-medium
                        ${overdue ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-500"}`}>
                        <Calendar size={10} />
                        {overdue && "Overdue · "}
                        {format(new Date(task.dueDate), "MMM d, yyyy")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Menu */}
                <div className="relative shrink-0">
                  <button
                    onClick={() => setOpenMenu(openMenu === task._id ? null : task._id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                  >
                    <MoreVertical size={15} />
                  </button>
                  {openMenu === task._id && (
                    <div className="absolute right-0 top-8 z-20 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 w-40">
                      <button onClick={() => openEdit(task)}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 font-medium">
                        Edit Task
                      </button>
                      {isProjectAdmin && (
                        <button onClick={() => handleDeleteTask(task._id)}
                          className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 font-medium">
                          Delete Task
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Click outside to close menu */}
      {openMenu && <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />}

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="card w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{editingTask ? "Edit Task" : "New Task"}</h2>
                <p className="text-slate-400 text-sm mt-0.5">{editingTask ? "Update task details" : "Add a new task to this project"}</p>
              </div>
              <button onClick={() => setShowTaskModal(false)} className="btn-ghost p-2 rounded-xl"><X size={18} /></button>
            </div>
            <form onSubmit={handleTaskSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Title <span className="text-red-400">*</span></label>
                <input className="input" placeholder="What needs to be done?" value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} required autoFocus />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
                <textarea className="input resize-none h-20" placeholder="Add more details..." value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status</label>
                  <select className="input" value={taskForm.status} onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}>
                    {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Priority</label>
                  <select className="input" value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {/* Assignee — only admins can assign tasks */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Assignee
                    {!isProjectAdmin && (
                      <span className="ml-2 text-xs font-normal text-slate-400">(admin only)</span>
                    )}
                  </label>
                  {isProjectAdmin ? (
                    <select
                      className="input"
                      value={taskForm.assignee}
                      onChange={(e) => setTaskForm({ ...taskForm, assignee: e.target.value })}
                    >
                      <option value="">Unassigned</option>
                      {allMembers.map(({ user: u }) => (
                        <option key={u._id} value={u._id}>{u.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="input bg-slate-50 text-slate-400 cursor-not-allowed flex items-center gap-2">
                      <span className="text-slate-300">🔒</span>
                      {taskForm.assignee
                        ? allMembers.find((m) => m.user._id === taskForm.assignee)?.user.name || "Assigned"
                        : "Only admins can assign"}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Due Date</label>
                  <input type="date" className="input" value={taskForm.dueDate}
                    onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowTaskModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1" disabled={submitting}>
                  {submitting ? "Saving..." : editingTask ? "Save Changes" : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="card w-full max-w-sm p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Add Member</h2>
                <p className="text-slate-400 text-sm mt-0.5">Invite someone to this project</p>
              </div>
              <button onClick={() => setShowMemberModal(false)} className="btn-ghost p-2 rounded-xl"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
                <input type="email" className="input" value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  placeholder="member@example.com" required autoFocus />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Project Role</label>
                <select className="input" value={memberRole} onChange={(e) => setMemberRole(e.target.value)}>
                  <option value="member">Member — can create & update tasks</option>
                  <option value="admin">Admin — can manage members & delete tasks</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowMemberModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1" disabled={submitting}>
                  {submitting ? "Adding..." : "Add Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
