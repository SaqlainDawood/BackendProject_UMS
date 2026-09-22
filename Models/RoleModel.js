// Models/RoleModel.js
import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    permissions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Permission",
      },
    ],
    isSystemRole: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
  },
  { timestamps: true }
);

roleSchema.methods.hasPermission = function (permissionKey) {
  return this.permissions.some((p) => {
    if (typeof p === "object" && p.key) {
      return p.key === permissionKey;
    }
    return false;
  });
};

roleSchema.index({ isActive: 1 });

const Role = mongoose.models.Role || mongoose.model("Role", roleSchema);
export default Role;  