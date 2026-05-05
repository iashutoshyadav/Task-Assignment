import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { Plus, FolderKanban, Trash2, Users, X, ArrowRight, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const PROJECT_COLORS = [
  "from-violet-500 to-indigo-500",
  "from-pink-500 to-rose-500",
  "from-amber-500 to-orange-500",
  "from-emerald-500 to-teal-500",
  "from-blue-500 to-cyan-500",
  "from-fuchsia-500 to-purple-500",
];

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [submitting, setSubmitting] = useState(false);

  const fetchProjects = () =>
    api.get("/projects").then(({ data }) => setProjects(data)).finally(() => setLoading(false));

  useEffect(() => { fetchProjects(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/projects", form);
      toast.success("Project created!");
      setShowModal(false);
      setForm({ name: "", description: "" });
      fetchProjects();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this project and all its tasks?")) return;
    try {
      await api.delete(`/projects/${id}`);
      toast.success("Project deleted");
      setProjects((p) => p.filter((x) => x._id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-[3px] border-violet-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">{projects.length} project{projects.length !== 1 ? "s" : ""} in your workspace</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={16} /> New Project
        </button>
      </div>

      {/* Empty state */}
      {projects.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-20 h-20 bg-violet-50 rounded-3xl flex items-center justify-center mx-auto mb-5">
            <FolderKanban size={36} className="text-violet-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">No projects yet</h3>
          <p className="text-slate-400 text-sm mb-6 max-w-xs mx-auto">
            Create your first project to start organizing tasks and collaborating with your team.
          </p>
          <button onClick={() => setShowModal(true)} className="btn-primary mx-auto">
            <Plus size={16} /> Create your first project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {projects.map((project, i) => {
            const gradient = PROJECT_COLORS[i % PROJECT_COLORS.length];
            const isOwner = user.role === "admin" || project.owner._id === user._id;
            return (
              <Link
                key={project._id}
                to={`/projects/${project._id}`}
                className="card group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col"
              >
                {/* Color bar */}
                <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />

                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm`}>
                      <FolderKanban size={20} className="text-white" />
                    </div>
                    {isOwner && (
                      <button
                        onClick={(e) => handleDelete(project._id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>

                  <h3 className="font-bold text-slate-900 text-base mb-1 group-hover:text-violet-700 transition-colors">
                    {project.name}
                  </h3>
                  {project.description
                    ? <p className="text-sm text-slate-500 line-clamp-2 mb-4 flex-1">{project.description}</p>
                    : <div className="flex-1" />}

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                      <Users size={13} />
                      <span>{(project.members?.length || 0) + 1} member{project.members?.length !== 0 ? "s" : ""}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Calendar size={12} />
                      <span>{formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>

                <div className={`px-5 py-2.5 bg-gradient-to-r ${gradient} bg-opacity-5 flex items-center justify-between border-t border-slate-100`}>
                  <span className="text-xs font-semibold text-slate-500">by {project.owner?.name}</span>
                  <ArrowRight size={14} className="text-slate-400 group-hover:text-violet-600 group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="card w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">New Project</h2>
                <p className="text-slate-500 text-sm mt-0.5">Set up your project workspace</p>
              </div>
              <button onClick={() => setShowModal(false)} className="btn-ghost p-2 rounded-xl">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Project Name <span className="text-red-400">*</span></label>
                <input
                  className="input"
                  placeholder="e.g. Website Redesign"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
                <textarea
                  className="input resize-none h-28"
                  placeholder="What is this project about? What will the team accomplish?"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1" disabled={submitting}>
                  {submitting ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
