import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["admin", "member"], default: "member" },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [memberSchema],
  },
  { timestamps: true }
);

// Owner is always implicitly a member
projectSchema.methods.isMember = function (userId) {
  const id = userId.toString();
  if (this.owner.toString() === id) return true;
  return this.members.some((m) => m.user.toString() === id);
};

projectSchema.methods.isAdmin = function (userId) {
  const id = userId.toString();
  if (this.owner.toString() === id) return true;
  return this.members.some((m) => m.user.toString() === id && m.role === "admin");
};

export default mongoose.model("Project", projectSchema);
