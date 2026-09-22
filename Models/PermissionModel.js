import mongoose from "mongoose";

const permissionSchema = new mongoose.Schema(
  {
    module: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    action: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    key: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    category: {
      type: String,
      default: "general",
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);
permissionSchema.pre("validate", function (next) {
  if (this.module && this.action && !this.key) {
    this.key = `${this.module}:${this.action}`;
  }
  next();
});
permissionSchema.index({ module: 1, action: 1 });
permissionSchema.index({ category: 1 });
const Permission =
  mongoose.models.Permission || mongoose.model("Permission", permissionSchema);
export default Permission;