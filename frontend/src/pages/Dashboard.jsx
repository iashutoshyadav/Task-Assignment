import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import {
  CheckCircle2, Clock, AlertTriangle, FolderKanban,
  ListTodo, User, TrendingUp, ArrowRight, Flag
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const STATUS_STYLE = {
  todo:        { label: "To Do",       cls: "bg-slate-100 text-slate-600" },
  in_progress: { label: "In Progress", cls: "bg-blue-100 text-blue-700" },
  done:        { label: "Done",        cls: "bg-emerald-100 text-emerald-700" },
};

const PRIORITY_STYLE = {
  low:    "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  high:   "bg-red-100 text-red-700",
};

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/dashboard").then(({ data }) => setData(data)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-[3px] border-violet-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const { stats, recentTasks } = data || {};
  const completion = stats?.total ? Math.round((stats.done / stats.total) * 100) : 0;

  const cards = [
    { label: "Total Tasks",  value: stats?.total ?? 0,      icon: ListTodo,     bg: "bg-violet-50",  icon_cls: "text-violet-600",  border: "border-violet-100" },
    { label: "In Progress",  value: stats?.inProgress ?? 0, icon: Clock,        bg: "bg-blue-50",    icon_cls: "text-blue-600",    border: "border-blue-100" },
    { label: "Completed",    value: stats?.done ?? 0,       icon: CheckCircle2, bg: "bg-emerald-50", icon_cls: "text-emerald-600", border: "border-emerald-100" },
    { label: "Overdue",      value: stats?.overdue ?? 0,    icon: AlertTriangle,bg: "bg-red-50",     icon_cls: "text-red-500",     border: "border-red-100" },
    { label: "My Tasks",     value: stats?.myTasks ?? 0,    icon: User,         bg: "bg-amber-50",   icon_cls: "text-amber-600",   border: "border-amber-100" },
    { label: "Projects",     value: stats?.projects ?? 0,   icon: FolderKanban, bg: "bg-indigo-50",  icon_cls: "text-indigo-600",  border: "border-indigo-100" },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Good {greeting()}, {user?.name?.split(" ")[0]} 👋</h1>
          <p className="page-subtitle">Here's your workspace overview for today.</p>
        </div>
        <Link to="/projects" className="btn-primary hidden sm:flex">
          <FolderKanban size={16} /> View Projects
        </Link>
      </div>

      {/* Progress banner */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-6 text-white flex items-center justify-between gap-6">
        <div>
          <p className="text-violet-200 text-sm font-medium mb-1">Overall Completion</p>
          <p className="text-4xl font-bold">{completion}%</p>
          <p className="text-violet-200 text-sm mt-1">{stats?.done} of {stats?.total} tasks done</p>
        </div>
        <div className="flex-1 max-w-xs hidden sm:block">
          <div className="h-3 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-1000"
              style={{ width: `${completion}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-violet-200 mt-2">
            <span>{stats?.todo} to do</span>
            <span>{stats?.inProgress} in progress</span>
            <span>{stats?.done} done</span>
          </div>
        </div>
        <TrendingUp size={48} className="text-white/20 shrink-0 hidden lg:block" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map(({ label, value, icon: Icon, bg, icon_cls, border }) => (
          <div key={label} className={`card p-4 border ${border} hover:shadow-md transition-shadow`}>
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
              <Icon size={20} className={icon_cls} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-900">Recent Activity</h2>
          <Link to="/projects" className="text-xs text-violet-600 hover:text-violet-700 font-semibold flex items-center gap-1">
            All projects <ArrowRight size={12} />
          </Link>
        </div>

        {!recentTasks?.length ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ListTodo size={28} className="text-slate-400" />
            </div>
            <p className="font-semibold text-slate-600">No activity yet</p>
            <p className="text-slate-400 text-sm mt-1">Create a project to get started.</p>
            <Link to="/projects" className="btn-primary mt-4 inline-flex">
              <FolderKanban size={15} /> Create Project
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {recentTasks.map((task) => (
              <li key={task._id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50/60 transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${STATUS_STYLE[task.status]?.cls}`}>
                  {task.status === "done"
                    ? <CheckCircle2 size={15} />
                    : task.status === "in_progress"
                    ? <Clock size={15} />
                    : <ListTodo size={15} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${task.status === "done" ? "text-slate-400 line-through" : "text-slate-800"}`}>
                    {task.title}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {task.project?.name} · {formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`badge ${PRIORITY_STYLE[task.priority]}`}>
                    <Flag size={9} /> {task.priority}
                  </span>
                  <span className={`badge ${STATUS_STYLE[task.status]?.cls} hidden sm:inline-flex`}>
                    {STATUS_STYLE[task.status]?.label}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
}
