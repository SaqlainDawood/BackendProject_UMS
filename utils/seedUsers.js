// utils/seedUsers.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import User from "../Models/UserModel.js";
import Role from "../Models/RoleModel.js";
import connectDB from "../Config/ConnectDB.js";

dotenv.config();

/* ============================================================
   USERS TO CREATE
   ============================================================ */
const USERS_TO_SEED = [
  {
    email: "superadmin@ums.com",
    password: "SuperAdmin@123",       // 🔐 change after first login
    roleSlug: "super-admin",
    isActive: true,
  },
  {
    email: "admin@ums.com",
    password: "Admin@123",            // 🔐 change after first login
    roleSlug: "admin",
    isActive: true,
  },
];

/* ============================================================
   SEED FUNCTION
   ============================================================ */
async function seedUsers() {
  try {
    await connectDB();
    console.log("✅ DB connected for user seeding...\n");

    // Fetch all roles for slug → _id mapping
    const roles = await Role.find({});
    const roleBySlug = {};
    roles.forEach((r) => {
      roleBySlug[r.slug] = r;
    });

    console.log("📋 Available roles:", Object.keys(roleBySlug).join(", "));
    console.log("");

    for (const u of USERS_TO_SEED) {
      const targetRole = roleBySlug[u.roleSlug];

      if (!targetRole) {
        console.log(`❌ Role "${u.roleSlug}" not found in DB. Skipping ${u.email}`);
        continue;
      }

      // Check if user already exists
      const existing = await User.findOne({ email: u.email });

      if (existing) {
        // Update role & password if needed
        const hashed = await bcrypt.hash(u.password, 10);
        existing.role = targetRole._id;
        existing.roleSlug = u.roleSlug;
        existing.password = hashed;
        existing.isActive = true;
        existing.isDeleted = false;
        await existing.save();
        console.log(`🔄 User updated: ${u.email} → role="${u.roleSlug}"`);
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(u.password, 10);

      // Create user
      await User.create({
        email: u.email,
        password: hashedPassword,
        role: targetRole._id,
        roleSlug: u.roleSlug,
        isActive: u.isActive,
        isDeleted: false,
      });

      console.log(`✅ User created: ${u.email} → role="${u.roleSlug}"`);
    }

    console.log("\n================ LOGIN CREDENTIALS ================");
    USERS_TO_SEED.forEach((u) => {
      console.log(`👤 ${u.roleSlug.padEnd(12)} | ${u.email.padEnd(25)} | ${u.password}`);
    });
    console.log("===================================================");
    console.log("⚠️  IMPORTANT: Change these passwords after first login!\n");

    console.log("🎉 User seeding complete!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed error:", err);
    process.exit(1);
  }
}

seedUsers();