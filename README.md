# TaskFlow — Team Task Manager

A full-stack web app for managing projects, assigning tasks, and tracking team progress with role-based access control.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Tailwind CSS |
| Backend | Node.js, Express (ES Modules) |
| Database | MongoDB (Mongoose) |
| Auth | JWT (JSON Web Tokens) |
| Deployment | Railway |

## Features

- **Authentication** — Signup / Login with JWT, persistent sessions
- **Role-Based Access** — Global roles (Admin / Member) + per-project roles
- **Projects** — Create, view, update, delete projects; invite members by email
- **Tasks** — Create, assign, filter, update status (To Do / In Progress / Done), set priority & due dates
- **Dashboard** — Live stats: total tasks, in-progress, done, overdue, my tasks, project count + recent activity feed
- **Overdue detection** — Tasks past due date highlighted in red

## Project Structure

```
team-task/
├── backend/
│   └── src/
│       ├── controllers/   # Business logic
│       ├── middleware/    # Auth + validation
│       ├── models/        # Mongoose schemas (User, Project, Task)
│       └── routes/        # Express routers
├── frontend/
│   └── src/
│       ├── api/           # Axios instance
│       ├── components/    # Layout, ProtectedRoute
│       ├── context/       # AuthContext
│       └── pages/         # Login, Register, Dashboard, Projects, ProjectDetail
├── railway.toml
└── package.json           # Monorepo build scripts
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Current user |
| GET | /api/auth/users | All users (for assignment) |
| GET | /api/projects | List accessible projects |
| POST | /api/projects | Create project |
| GET | /api/projects/:id | Get project detail |
| PUT | /api/projects/:id | Update project |
| DELETE | /api/projects/:id | Delete project + tasks |
| POST | /api/projects/:id/members | Add member by email |
| DELETE | /api/projects/:id/members/:userId | Remove member |
| GET | /api/projects/:id/tasks | List tasks (filterable) |
| POST | /api/projects/:id/tasks | Create task |
| PUT | /api/projects/:id/tasks/:taskId | Update task |
| DELETE | /api/projects/:id/tasks/:taskId | Delete task |
| GET | /api/dashboard | Dashboard stats |

## Local Development

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier)

### Setup

1. **Clone & install**
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Configure backend** — copy `backend/.env.example` to `backend/.env` and fill in:
   ```
   MONGO_URI=mongodb+srv://...
   JWT_SECRET=your_random_secret
   ```

3. **Run both servers**
   ```bash
   # Terminal 1
   cd backend && npm run dev

   # Terminal 2
   cd frontend && npm run dev
   ```

4. Open `http://localhost:5173`

## Deployment on Railway

1. Push this repo to GitHub
2. Create a new Railway project → **Deploy from GitHub repo**
3. Add environment variables in Railway dashboard:
   - `MONGO_URI` — your MongoDB Atlas connection string
   - `JWT_SECRET` — a long random string
   - `NODE_ENV` — `production`
4. Railway auto-detects `railway.toml` and runs `npm run build` then `npm start`
5. Your app is live!

> **MongoDB Atlas setup**: Create a free cluster at mongodb.com/atlas, whitelist `0.0.0.0/0` in Network Access, and copy the connection string.

## Role-Based Access

| Action | Admin (global) | Project Owner | Project Admin | Project Member |
|--------|---------------|---------------|---------------|----------------|
| View all projects | ✅ | own only | own only | own only |
| Create project | ✅ | ✅ | ✅ | ✅ |
| Delete project | ✅ | ✅ | ❌ | ❌ |
| Add/remove members | ✅ | ✅ | ✅ | ❌ |
| Create tasks | ✅ | ✅ | ✅ | ✅ |
| Delete tasks | ✅ | ✅ | ✅ | ❌ |
| Update task status | ✅ | ✅ | ✅ | ✅ |
