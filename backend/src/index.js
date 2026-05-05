import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import mongoose from "mongoose";

import authRoutes from "./routes/auth.js";
import projectRoutes from "./routes/projects.js";
import dashboardRoutes from "./routes/dashboard.js";

const app = express();
const httpServer = createServer(app);

const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((o) => o.trim())
  : ["http://localhost:5173"];

// REST CORS
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  })
);

// Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Make io accessible in controllers via req.app.get("io")
app.set("io", io);

io.on("connection", (socket) => {
  // Client joins a project room to receive live updates for that project
  socket.on("join:project", (projectId) => {
    socket.join(`project:${projectId}`);
  });

  socket.on("leave:project", (projectId) => {
    socket.leave(`project:${projectId}`);
  });

  socket.on("disconnect", () => {});
});

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.get("/api/health", (_, res) => res.json({ status: "ok" }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  });
