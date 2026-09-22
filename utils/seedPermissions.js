// utils/seedPermissions.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import Permission from "../Models/PermissionModel.js";
import Role from "../Models/RoleModel.js";
import connectDB from "../Config/ConnectDB.js"; // apne path ke mutabiq

dotenv.config();

/* ============================================================
   MASTER PERMISSION LIST
   ============================================================ */
const PERMISSIONS = [
  // ---------- STUDENT ----------
  { module: "student", action: "view",   label: "View Student",   category: "academics" },
  { module: "student", action: "add",    label: "Add Student",    category: "academics" },
  { module: "student", action: "update", label: "Update Student", category: "academics" },
  { module: "student", action: "delete", label: "Delete Student", category: "academics" },

  // ---------- TEACHER ----------
  { module: "teacher", action: "view",   label: "View Teacher",   category: "academics" },
  { module: "teacher", action: "add",    label: "Add Teacher",    category: "academics" },
  { module: "teacher", action: "update", label: "Update Teacher", category: "academics" },
  { module: "teacher", action: "delete", label: "Delete Teacher", category: "academics" },

  // ---------- ATTENDANCE ----------
  { module: "attendance", action: "view",   label: "View Attendance",   category: "attendance" },
  { module: "attendance", action: "mark",   label: "Mark Attendance",   category: "attendance" },
  { module: "attendance", action: "update", label: "Update Attendance", category: "attendance" },
  { module: "attendance", action: "delete", label: "Delete Attendance", category: "attendance" },

  // ---------- MARKS ----------
  { module: "marks", action: "view",   label: "View Marks",   category: "examination" },
  { module: "marks", action: "add",    label: "Add Marks",    category: "examination" },
  { module: "marks", action: "update", label: "Update Marks", category: "examination" },
  { module: "marks", action: "delete", label: "Delete Marks", category: "examination" },

  // ---------- RESULT ----------
  { module: "result", action: "view",      label: "View Result",      category: "examination" },
  { module: "result", action: "publish",   label: "Publish Result",   category: "examination" },
  { module: "result", action: "unpublish", label: "Unpublish Result", category: "examination" },

  // ---------- EXAM ----------
  { module: "exam", action: "view",   label: "View Exam",   category: "examination" },
  { module: "exam", action: "create", label: "Create Exam", category: "examination" },
  { module: "exam", action: "update", label: "Update Exam", category: "examination" },
  { module: "exam", action: "delete", label: "Delete Exam", category: "examination" },

  // ---------- SUBJECT ----------
  { module: "subject", action: "view",   label: "View Subject",   category: "academics" },
  { module: "subject", action: "add",    label: "Add Subject",    category: "academics" },
  { module: "subject", action: "update", label: "Update Subject", category: "academics" },
  { module: "subject", action: "delete", label: "Delete Subject", category: "academics" },

  // ---------- BATCH ----------
  { module: "batch", action: "view",   label: "View Batch",   category: "academics" },
  { module: "batch", action: "add",    label: "Add Batch",    category: "academics" },
  { module: "batch", action: "update", label: "Update Batch", category: "academics" },
  { module: "batch", action: "delete", label: "Delete Batch", category: "academics" },

  // ---------- CAMPUS ----------
  { module: "campus", action: "view",   label: "View Campus",   category: "administration" },
  { module: "campus", action: "add",    label: "Add Campus",    category: "administration" },
  { module: "campus", action: "update", label: "Update Campus", category: "administration" },
  { module: "campus", action: "delete", label: "Delete Campus", category: "administration" },

  // ---------- CLASS ----------
  { module: "class", action: "view",   label: "View Class",   category: "academics" },
  { module: "class", action: "add",    label: "Add Class",    category: "academics" },
  { module: "class", action: "update", label: "Update Class", category: "academics" },
  { module: "class", action: "delete", label: "Delete Class", category: "academics" },

  // ---------- COORDINATOR ----------
  { module: "coordinator", action: "view",   label: "View Coordinator",   category: "administration" },
  { module: "coordinator", action: "add",    label: "Add Coordinator",    category: "administration" },
  { module: "coordinator", action: "update", label: "Update Coordinator", category: "administration" },
  { module: "coordinator", action: "delete", label: "Delete Coordinator", category: "administration" },

  // ---------- FEES ----------
  { module: "fee", action: "view",   label: "View Fee",   category: "finance" },
  { module: "fee", action: "add",    label: "Add Fee",    category: "finance" },
  { module: "fee", action: "update", label: "Update Fee", category: "finance" },
  { module: "fee", action: "delete", label: "Delete Fee", category: "finance" },

  // ---------- NOTIFICATIONS ----------
  { module: "notification", action: "view",   label: "View Notification",   category: "communication" },
  { module: "notification", action: "send",   label: "Send Notification",   category: "communication" },
  { module: "notification", action: "delete", label: "Delete Notification", category: "communication" },

  // ---------- REPORTS ----------
  { module: "report", action: "view",     label: "View Reports",     category: "reports" },
  { module: "report", action: "download", label: "Download Reports", category: "reports" },

  // ---------- CMS (Role & Permission Management) ----------
  { module: "role", action: "view",   label: "View Roles",   category: "cms" },
  { module: "role", action: "create", label: "Create Role",  category: "cms" },
  { module: "role", action: "update", label: "Update Role",  category: "cms" },
  { module: "role", action: "delete", label: "Delete Role",  category: "cms" },

  { module: "permission", action: "view",   label: "View Permissions",   category: "cms" },
  { module: "permission", action: "create", label: "Create Permission",  category: "cms" },
  { module: "permission", action: "delete", label: "Delete Permission",  category: "cms" },

  // ---------- JOB POSTS (Recruitment) ----------
{ module: "jobpost", action: "view",   label: "View Job Posts",   category: "recruitment" },
{ module: "jobpost", action: "create", label: "Create Job Post",  category: "recruitment" },
{ module: "jobpost", action: "update", label: "Update Job Post",  category: "recruitment" },
{ module: "jobpost", action: "delete", label: "Delete Job Post",  category: "recruitment" },

// ---------- STAFF ----------
{ module: "staff", action: "view",    label: "View Staff Applications",   category: "recruitment" },
{ module: "staff", action: "approve", label: "Approve/Reject Staff",      category: "recruitment" },
{ module: "staff", action: "delete",  label: "Delete Staff Application",  category: "recruitment" },
];

/* ============================================================
   SYSTEM ROLES (with slug — auto-created / updated on seed)
   ============================================================ */
const SYSTEM_ROLES = [
  {
    name: "Super Admin",
    slug: "super-admin",
    description: "Full access to everything",
    permissionKeys: PERMISSIONS.map((p) => `${p.module}:${p.action}`),
    isSystemRole: true,
  },
  {
    name: "Admin",
    slug: "admin",
    description: "Administrative access (no CMS delete)",
    permissionKeys: PERMISSIONS
      .filter((p) => p.module !== "role" && p.module !== "permission")
      .map((p) => `${p.module}:${p.action}`),
    isSystemRole: true,
  },
  {
    name: "Teacher",
    slug: "teacher",
    description: "Teaching staff",
    permissionKeys: [
      "student:view",
      "attendance:view",
      "attendance:mark",
      "attendance:update",
      "marks:view",
      "marks:add",
      "marks:update",
      "result:view",
      "exam:view",
      "subject:view",
      "class:view",
    ],
    isSystemRole: true,
  },
  {
    name: "Student",
    slug: "student",
    description: "Student portal access",
    permissionKeys: [
      "attendance:view",
      "marks:view",
      "result:view",
      "exam:view",
      "fee:view",
      "notification:view",
    ],
    isSystemRole: true,
  },
  {
    name: "Coordinator",
    slug: "coordinator",
    description: "Coordinates batches and classes",
    permissionKeys: [
      "student:view",
      "teacher:view",
      "batch:view",
      "batch:update",
      "class:view",
      "class:update",
      "attendance:view",
      "report:view",
    ],
    isSystemRole: true,
  },
];

/* ============================================================
   SEED FUNCTION
   ============================================================ */
async function seed() {
  try {
    await connectDB();
    console.log("✅ DB connected for seeding...\n");

    /* ---------- 1. Insert / sync permissions (upsert) ---------- */
    let inserted = 0;
    for (const p of PERMISSIONS) {
      const key = `${p.module}:${p.action}`;
      const result = await Permission.updateOne(
        { key },
        { $setOnInsert: { ...p, key } },
        { upsert: true }
      );
      if (result.upsertedCount) inserted++;
    }
    console.log(`✅ Permissions synced. Newly inserted: ${inserted}`);

    /* ---------- 2. Fetch all permissions (key → _id map) ---------- */
    const allPermissions = await Permission.find({});
    const permissionMap = {};
    allPermissions.forEach((p) => {
      permissionMap[p.key] = p._id;
    });
    console.log(`📦 Total permissions in DB: ${allPermissions.length}\n`);

    /* ---------- 3. Upsert system roles (by name) ---------- */
    for (const r of SYSTEM_ROLES) {
      const permIds = r.permissionKeys
        .map((k) => permissionMap[k])
        .filter(Boolean);

      const existing = await Role.findOne({ name: r.name });

      if (existing) {
        existing.slug = r.slug;
        existing.description = r.description;
        existing.permissions = permIds;
        existing.isSystemRole = true;
        existing.isActive = true;
        await existing.save();
        console.log(
          `🔄 Role updated: ${r.name} → slug="${r.slug}" (${permIds.length} permissions)`
        );
      } else {
        await Role.create({
          name: r.name,
          slug: r.slug,
          description: r.description,
          permissions: permIds,
          isSystemRole: r.isSystemRole,
          isActive: true,
        });
        console.log(
          `✅ Role created: ${r.name} → slug="${r.slug}" (${permIds.length} permissions)`
        );
      }
    }

    console.log("\n🎉 Seeding complete!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed error:", err);
    process.exit(1);
  }
}

seed();