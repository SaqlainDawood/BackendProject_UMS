// utils/migrateUsers.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../Models/UserModel.js";
import Role from "../Models/RoleModel.js";
import connectDB from "../Config/ConnectDB.js"; // apne path ke mutabiq

dotenv.config();

/* ============================================================
   MIGRATION MAP
   Purana string role  →  Naya Role slug
   ============================================================ */
const ROLE_SLUG_MAP = {
  admin: "admin",           // "admin" string → "admin" role slug
  faculty: "teacher",       // "faculty" string → "teacher" role
  student: "student",
  coordinator: "coordinator",
  // Agar aur purane roles hain to yahan add karein
  teacher: "teacher",
  superadmin: "super-admin",
  "super admin": "super-admin",
};

async function migrate() {
  try {
    await connectDB();
    console.log("✅ DB connected for migration...\n");

    // 1. Saare roles fetch karo (slug → _id mapping)
    const roles = await Role.find({});
    const roleBySlug = {};
    roles.forEach((r) => {
      roleBySlug[r.slug] = r;
    });

    console.log("📋 Available roles in DB:");
    Object.keys(roleBySlug).forEach((slug) => {
      console.log(`   - ${slug} (${roleBySlug[slug].name})`);
    });
    console.log("");

    // 2. Users fetch karo jinka role abhi bhi string hai ya missing hai
    //    (mongoose schema ab ObjectId expect kar raha hai, lekin
    //     purane data mein string hai — is liye direct collection query)
    const rawUsers = await mongoose.connection
      .collection("users")
      .find({})
      .toArray();

    console.log(`📊 Total users found: ${rawUsers.length}\n`);

    let migrated = 0;
    let skipped = 0;
    let failed = 0;
    const failedUsers = [];

    for (const u of rawUsers) {
      const oldRole = u.role;

      // Agar already ObjectId hai (naya user) → skip
      if (oldRole instanceof mongoose.Types.ObjectId) {
        skipped++;
        continue;
      }

      // Agar string hai → map karo
      if (typeof oldRole === "string") {
        const normalized = oldRole.toLowerCase().trim();
        const targetSlug = ROLE_SLUG_MAP[normalized];

        if (!targetSlug) {
          console.log(`⚠️  Unknown role "${oldRole}" for user ${u.email}`);
          failedUsers.push({ email: u.email, role: oldRole, reason: "no mapping" });
          failed++;
          continue;
        }

        const targetRole = roleBySlug[targetSlug];
        if (!targetRole) {
          console.log(`⚠️  Role slug "${targetSlug}" not found in DB for ${u.email}`);
          failedUsers.push({ email: u.email, role: oldRole, reason: "slug not in DB" });
          failed++;
          continue;
        }

        // ✅ Update user
        await mongoose.connection.collection("users").updateOne(
          { _id: u._id },
          {
            $set: {
              role: targetRole._id,
              roleSlug: targetSlug,
            },
          }
        );

        console.log(`✅ ${u.email}: "${oldRole}" → ${targetSlug}`);
        migrated++;
      } else {
        // role null / undefined
        console.log(`⚠️  User ${u.email} has no role, skipping.`);
        failedUsers.push({ email: u.email, role: oldRole, reason: "null/undefined" });
        failed++;
      }
    }

    console.log("\n================ SUMMARY ================");
    console.log(`✅ Migrated: ${migrated}`);
    console.log(`⏭️  Skipped (already ObjectId): ${skipped}`);
    console.log(`❌ Failed: ${failed}`);

    if (failedUsers.length) {
      console.log("\n❌ Failed users:");
      failedUsers.forEach((f) => {
        console.log(`   - ${f.email} (role="${f.role}", reason=${f.reason})`);
      });
    }

    console.log("=========================================\n");

    // 3. Verification — ab schema ke through check karein
    const testUser = await User.findOne({}).populate("role");
    if (testUser) {
      console.log("🔍 Verification (first user):");
      console.log(`   email: ${testUser.email}`);
      console.log(`   role populated: ${testUser.role?.name || "N/A"}`);
      console.log(`   roleSlug: ${testUser.roleSlug}`);
      console.log(`   permissions count: ${testUser.role?.permissions?.length || 0}`);
    }

    console.log("\n🎉 Migration complete!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration error:", err);
    process.exit(1);
  }
}

migrate();