import User from "../../Models/UserModel.js";

export const getAllUsers = async (req, res) => {
  try {
    const { isActive } = req.query;
    const filter = { isDeleted: false };

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    const users = await User.find(filter)
      .populate("role", "name slug")
      .select("_id email role roleSlug isActive createdAt")
      .sort({ createdAt: -1 });

    const payload = users.map((user) => ({
      _id: user._id,
      email: user.email,
      name: user.email?.split("@")[0] || "User",
      role: user.role,
      roleSlug: user.roleSlug,
      isActive: user.isActive,
      createdAt: user.createdAt,
    }));

    return res.status(200).json({
      success: true,
      count: payload.length,
      data: payload,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
