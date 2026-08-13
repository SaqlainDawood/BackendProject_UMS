import Session from "../../../Models/Session.js";

// CREATE
export const createSession = async (req, res) => {
  try {
    const { name, term, year, startDate, endDate, isActive } = req.body;

    if (isActive) {
      await Session.updateMany({}, { isActive: false });
    }

    const session = await Session.create({ name, term, year, startDate, endDate, isActive });
    res.status(201).json({ success: true, data: session });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: "This session already exists" });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

// READ - all (optional filter by term/year)
export const getSessions = async (req, res) => {
  try {
    const { term, year } = req.query;
    const filter = {};
    if (term) filter.term = term;
    if (year) filter.year = year;

    const sessions = await Session.find(filter).sort({ startDate: -1 });
    res.json({ success: true, data: sessions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// READ - current active session
export const getCurrentSession = async (req, res) => {
  try {
    const session = await Session.findOne({ isActive: true });
    if (!session) {
      return res.status(404).json({ success: false, message: "No active session set" });
    }
    res.json({ success: true, data: session });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// READ - single
export const getSessionById = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }
    res.json({ success: true, data: session });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// UPDATE
export const updateSession = async (req, res) => {
  try {
    const { isActive } = req.body;

    if (isActive) {
      await Session.updateMany({}, { isActive: false });
    }

    const session = await Session.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }
    res.json({ success: true, data: session });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: "This session already exists" });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE
export const deleteSession = async (req, res) => {
  try {
    const session = await Session.findByIdAndDelete(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }
    res.json({ success: true, message: "Session deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};