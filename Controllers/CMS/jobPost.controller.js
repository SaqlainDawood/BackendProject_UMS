// Controllers/Admin/JobPostController.js
import JobPost from "../../Models/JobPostModel.js";
import Role from "../../Models/RoleModel.js";

/* ============================================================
   1. CREATE JOB POST
   POST /api/admin/job-posts
   Permission: jobpost:create
   ============================================================ */
export const createJobPost = async (req, res) => {
  try {
    const {
      title,
      description,
      roleSlug,
      department,
      designation,
      vacancies,
      employmentType,
      experienceRequired,
      qualification,
      salaryRange,
      city,
      campus,
      deadline,
      joiningDate,
      status,
    } = req.body;

    // Validation
    if (!title || !roleSlug) {
      return res.status(400).json({
        success: false,
        message: "title and roleSlug are required",
      });
    }

    // Role exists check
    const role = await Role.findOne({
      slug: roleSlug.toLowerCase(),
      isActive: true,
    });
    if (!role) {
      return res.status(400).json({
        success: false,
        message: `Role "${roleSlug}" not found or inactive`,
      });
    }

    const jobPost = await JobPost.create({
      title,
      description: description || "",
      roleSlug: roleSlug.toLowerCase(),
      department: department || "",
      designation: designation || "",
      vacancies: vacancies || 1,
      employmentType: employmentType || "Full-time",
      experienceRequired: experienceRequired || 0,
      qualification: qualification || "",
      salaryRange: salaryRange || { min: 0, max: 0, negotiable: false },
      city: city || "",
      campus: campus || "",
      deadline: deadline || null,
      joiningDate: joiningDate || null,
      status: status || "open",
      createdBy: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: "Job post created successfully",
      jobPost,
    });
  } catch (err) {
    console.error("createJobPost error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ============================================================
   2. GET ALL JOB POSTS (with filters)
   GET /api/admin/job-posts?status=open&roleSlug=teacher
   Permission: jobpost:view
   ============================================================ */
export const getAllJobPosts = async (req, res) => {
  try {
    const { status, roleSlug, department, search } = req.query;

    const filter = { isDeleted: false };
    if (status) filter.status = status;
    if (roleSlug) filter.roleSlug = roleSlug.toLowerCase();
    if (department) filter.department = department;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const jobPosts = await JobPost.find(filter)
      .populate("createdBy", "email")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: jobPosts.length,
      jobPosts,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ============================================================
   3. GET SINGLE JOB POST
   GET /api/admin/job-posts/:id
   Permission: jobpost:view
   ============================================================ */
export const getJobPostById = async (req, res) => {
  try {
    const jobPost = await JobPost.findById(req.params.id).populate(
      "createdBy",
      "email"
    );

    if (!jobPost || jobPost.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Job post not found",
      });
    }

    return res.json({ success: true, jobPost });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ============================================================
   4. UPDATE JOB POST
   PUT /api/admin/job-posts/:id
   Permission: jobpost:update
   ============================================================ */
export const updateJobPost = async (req, res) => {
  try {
    const jobPost = await JobPost.findById(req.params.id);
    if (!jobPost || jobPost.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Job post not found",
      });
    }

    // Allowed fields
    const allowedFields = [
      "title",
      "description",
      "roleSlug",
      "department",
      "designation",
      "vacancies",
      "employmentType",
      "experienceRequired",
      "qualification",
      "salaryRange",
      "city",
      "campus",
      "deadline",
      "joiningDate",
      "status",
    ];

    // Agar roleSlug badal raha hai to verify karein
    if (req.body.roleSlug && req.body.roleSlug !== jobPost.roleSlug) {
      const role = await Role.findOne({
        slug: req.body.roleSlug.toLowerCase(),
        isActive: true,
      });
      if (!role) {
        return res.status(400).json({
          success: false,
          message: `Role "${req.body.roleSlug}" not found or inactive`,
        });
      }
      req.body.roleSlug = req.body.roleSlug.toLowerCase();
    }

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        jobPost[field] = req.body[field];
      }
    });

    await jobPost.save();

    return res.json({
      success: true,
      message: "Job post updated successfully",
      jobPost,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ============================================================
   5. CHANGE STATUS
   PATCH /api/admin/job-posts/:id/status
   Body: { status: "open" | "closed" | "filled" | "draft" }
   Permission: jobpost:update
   ============================================================ */
export const changeJobPostStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["draft", "open", "closed", "filled"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Allowed: draft, open, closed, filled",
      });
    }

    const jobPost = await JobPost.findById(req.params.id);
    if (!jobPost || jobPost.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Job post not found",
      });
    }

    jobPost.status = status;
    await jobPost.save();

    return res.json({
      success: true,
      message: `Job post status updated to "${status}"`,
      jobPost,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ============================================================
   6. DELETE JOB POST (soft delete)
   DELETE /api/admin/job-posts/:id
   Permission: jobpost:delete
   ============================================================ */
export const deleteJobPost = async (req, res) => {
  try {
    const jobPost = await JobPost.findById(req.params.id);
    if (!jobPost || jobPost.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Job post not found",
      });
    }

    jobPost.isDeleted = true;
    jobPost.status = "closed";
    jobPost.isActive = false;
    await jobPost.save();

    return res.json({
      success: true,
      message: "Job post deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ============================================================
   7. JOB POST STATS (DASHBOARD)
   GET /api/admin/job-posts/stats
   Permission: jobpost:view
    ============================================================ */
export const getJobPostStats = async (req, res) => {
  try {
    const [total, open, closed, filled, draft] = await Promise.all([
      JobPost.countDocuments({ isDeleted: false }),
      JobPost.countDocuments({ isDeleted: false, status: "open" }),
      JobPost.countDocuments({ isDeleted: false, status: "closed" }),
      JobPost.countDocuments({ isDeleted: false, status: "filled" }),
      JobPost.countDocuments({ isDeleted: false, status: "draft" }),
    ]);

    return res.json({
      success: true,
      stats: {
        total,
        open,
        closed,
        filled,
        draft,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};