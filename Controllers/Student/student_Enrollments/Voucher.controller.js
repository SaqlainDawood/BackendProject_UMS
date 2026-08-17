import Voucher from "../../../Models/Voucher.js";
import VoucherItem from "../../../Models/Voucheritem.js";
import Enrollment from "../../../Models/Enrollment.js";
import Batch from "../../../Models/Batch.js";
import TuitionFee from "../../../Models/Tuitionfee.js";
import FeeType from "../../../Models/Feetype.js";
import FineType from "../../../Models/Finetype.js";
import crypto from "crypto";

function cleanErrorMessage(err) {
  if (err.name === "CastError") return `Invalid ${err.path} — please provide a valid ID`;
  if (err.code === 11000) return "A voucher already exists for this student for this semester";
  if (err.name === "ValidationError") return Object.values(err.errors).map((e) => e.message).join(", ");
  return err.message || "Something went wrong, please try again";
}

// helper - voucher number generate (UE-2026-000001)
async function generateVoucherNo() {
  const year = new Date().getFullYear();
  const last = await Voucher.findOne({ voucherNo: new RegExp(`^UE-${year}-`) }).sort({ createdAt: -1 });
  const next = last ? parseInt(last.voucherNo.split("-")[2]) + 1 : 1;
  return `UE-${year}-${String(next).padStart(6, "0")}`;
}

// helper - live fine calculate karta hai (database mein overwrite nahi hoti jab tak paid na ho)
function calculateFine(voucher, fineType) {
  if (voucher.payStatus === "paid" || voucher.payStatus === "cancelled") return 0;
  if (!fineType) return 0;

  const today = new Date();
  const fineDueDate = new Date(voucher.fineDueDate);
  if (today <= fineDueDate) return 0; // abhi fine due date guzri nahi

  if (fineType.type === "fixed") {
    return fineType.amount; // ek hi baar lagegi, multiply nahi
  }
  if (fineType.type === "perDay") {
    const daysLate = Math.ceil((today - fineDueDate) / (1000 * 60 * 60 * 24));
    return daysLate * fineType.amount;
  }
  return 0;
}

function attachFine(voucherDoc) {
  const voucher = voucherDoc.toObject();
  const fineAmount = calculateFine(voucherDoc, voucherDoc.fineTypeId);
  return {
    ...voucher,
    fineAmount,
    totalAmount: voucher.baseAmount + fineAmount,
  };
}

// CREATE VOUCHER
export const createVoucher = async (req, res) => {
  try {
    const { studentId, enrollmentId: bodyEnrollmentId, semester, payDueDate, fineDueDate, fineTypeId, includeTransport, transportFeeTypeId, customItems } = req.body;

    if ((!studentId && !bodyEnrollmentId) || !semester || !payDueDate || !fineDueDate) {
      return res.status(400).json({
        success: false,
        message: "studentId (or enrollmentId), semester, payDueDate and fineDueDate are required",
      });
    }

    let enrollment;
    if (bodyEnrollmentId) {
      enrollment = await Enrollment.findById(bodyEnrollmentId).populate("batchId");
      if (!enrollment) {
        return res.status(400).json({ success: false, message: "Invalid enrollmentId" });
      }
    } else {
      // studentId se uski active enrollment khud dhoondo
      enrollment = await Enrollment.findOne({ studentId, status: "active" }).populate("batchId");
      if (!enrollment) {
        return res.status(400).json({
          success: false,
          message: "This student has no active enrollment. Please enroll the student in a batch first.",
        });
      }
    }
    const enrollmentId = enrollment._id;

    const batch = enrollment.batchId;
    if (!batch) {
      return res.status(400).json({ success: false, message: "This enrollment has no linked batch" });
    }

    if (fineTypeId) {
      const fineTypeExists = await FineType.findById(fineTypeId);
      if (!fineTypeExists) {
        return res.status(400).json({ success: false, message: "Invalid fineTypeId" });
      }
    }

    const resolvedItems = [];

    // 1. Tuition Fee — hamesha mandatory, Batch se department+degreeClass+shift le kar fetch hoti hai
    const tuitionFee = await TuitionFee.findOne({
      departmentId: batch.departmentId,
      degreeClassId: batch.degreeClassId,
      shiftId: batch.shiftId,
    });
    if (!tuitionFee) {
      return res.status(400).json({
        success: false,
        message: "Tuition fee not set for this department/class/shift. Please set it first.",
      });
    }
    resolvedItems.push({ type: "tuition", refId: tuitionFee._id, name: "Tuition Fee", amount: tuitionFee.amount });

    // 2. Transport Fee — optional, sirf agar student use karta hai
    if (includeTransport) {
      if (!transportFeeTypeId) {
        return res.status(400).json({ success: false, message: "transportFeeTypeId is required when includeTransport is true" });
      }
      const transportFee = await FeeType.findById(transportFeeTypeId);
      if (!transportFee) {
        return res.status(400).json({ success: false, message: "Invalid transportFeeTypeId" });
      }
      resolvedItems.push({ type: "feeType", refId: transportFee._id, name: transportFee.name, amount: transportFee.amount });
    }

    // 3. Custom items — optional (koi bhi extra charge)
    if (Array.isArray(customItems)) {
      for (const item of customItems) {
        if (!item.name || item.amount == null) {
          return res.status(400).json({ success: false, message: "Each custom item needs a name and amount" });
        }
        resolvedItems.push({ type: "custom", refId: null, name: item.name, amount: item.amount });
      }
    }

    const baseAmount = resolvedItems.reduce((sum, i) => sum + i.amount, 0);
    const voucherNo = await generateVoucherNo();
    const guid = crypto.randomUUID();

    const voucher = await Voucher.create({
      voucherNo,
      guid,
      enrollmentId,
      semester,
      payDueDate,
      fineDueDate,
      fineTypeId: fineTypeId || null,
      baseAmount,
      totalAmount: baseAmount,
    });

    const itemDocs = await VoucherItem.insertMany(
      resolvedItems.map((i) => ({ ...i, voucherId: voucher._id }))
    );

    res.status(201).json({ success: true, data: { voucher, items: itemDocs } });
  } catch (err) {
    res.status(400).json({ success: false, message: cleanErrorMessage(err) });
  }
};

// GET ALL VOUCHERS (fine live calculate hoti hai response mein)
export const getVouchers = async (req, res) => {
  try {
    const { studentId, enrollmentId, semester, payStatus } = req.query;
    const filter = {};

    if (studentId) {
      const enrollments = await Enrollment.find({ studentId }).select("_id");
      filter.enrollmentId = { $in: enrollments.map((e) => e._id) };
    } else if (enrollmentId) {
      filter.enrollmentId = enrollmentId;
    }
    if (semester) filter.semester = semester;
    if (payStatus) filter.payStatus = payStatus;

    const vouchers = await Voucher.find(filter)
      .populate({
        path: "enrollmentId",
        populate: [
          { path: "studentId", select: "firstName lastName cnic rollNo registrationNo" },
          { path: "batchId", populate: [
            { path: "departmentId", select: "name code" },
            { path: "degreeClassId", select: "name code" },
            { path: "shiftId", select: "name" },
          ]},
        ],
      })
      .populate("fineTypeId", "name type amount")
      .sort({ semester: 1 });

    res.json({ success: true, data: vouchers.map(attachFine) });
  } catch (err) {
    res.status(400).json({ success: false, message: cleanErrorMessage(err) });
  }
};

// GET VOUCHER BY ID (with items + live fine)
export const getVoucherById = async (req, res) => {
  try {
    const voucher = await Voucher.findById(req.params.id)
      .populate({
        path: "enrollmentId",
        populate: [
          { path: "studentId", select: "firstName lastName cnic rollNo registrationNo" },
          { path: "batchId", populate: [
            { path: "departmentId", select: "name code" },
            { path: "degreeClassId", select: "name code" },
            { path: "shiftId", select: "name" },
          ]},
        ],
      })
      .populate("fineTypeId", "name type amount");

    if (!voucher) {
      return res.status(404).json({ success: false, message: "Voucher not found" });
    }

    const items = await VoucherItem.find({ voucherId: voucher._id });

    res.json({ success: true, data: { voucher: attachFine(voucher), items } });
  } catch (err) {
    res.status(400).json({ success: false, message: cleanErrorMessage(err) });
  }
};

// UPDATE PAY STATUS — fine ko is waqt freeze karke totalAmount mein save kar deta hai
export const updateVoucherStatus = async (req, res) => {
  try {
    const { payStatus } = req.body;

    const voucher = await Voucher.findById(req.params.id).populate("fineTypeId", "name type amount");
    if (!voucher) {
      return res.status(404).json({ success: false, message: "Voucher not found" });
    }

    if (payStatus === "paid") {
      const fineAmount = calculateFine(voucher, voucher.fineTypeId);
      voucher.totalAmount = voucher.baseAmount + fineAmount;
      voucher.paidAt = new Date();
    }

    voucher.payStatus = payStatus;
    await voucher.save();

    res.json({ success: true, data: attachFine(voucher) });
  } catch (err) {
    res.status(400).json({ success: false, message: cleanErrorMessage(err) });
  }
};

// helper - ek enrollment ke liye voucher resolve + create karta hai (bulk aur single dono use karte hain)
async function buildVoucherForEnrollment(enrollment, { semester, payDueDate, fineDueDate, fineTypeId, includeTransport, transportFeeTypeId, customItems }) {
  const batch = enrollment.batchId;

  const tuitionFee = await TuitionFee.findOne({
    departmentId: batch.departmentId,
    degreeClassId: batch.degreeClassId,
    shiftId: batch.shiftId,
  });
  if (!tuitionFee) {
    throw new Error("Tuition fee not set for this department/class/shift");
  }

  const resolvedItems = [
    { type: "tuition", refId: tuitionFee._id, name: "Tuition Fee", amount: tuitionFee.amount },
  ];

  if (includeTransport) {
    if (!transportFeeTypeId) throw new Error("transportFeeTypeId is required when includeTransport is true");
    const transportFee = await FeeType.findById(transportFeeTypeId);
    if (!transportFee) throw new Error("Invalid transportFeeTypeId");
    resolvedItems.push({ type: "feeType", refId: transportFee._id, name: transportFee.name, amount: transportFee.amount });
  }

  if (Array.isArray(customItems)) {
    for (const item of customItems) {
      if (!item.name || item.amount == null) throw new Error("Each custom item needs a name and amount");
      resolvedItems.push({ type: "custom", refId: null, name: item.name, amount: item.amount });
    }
  }

  const baseAmount = resolvedItems.reduce((sum, i) => sum + i.amount, 0);
  const voucherNo = await generateVoucherNo();
  const guid = crypto.randomUUID();

  const voucher = await Voucher.create({
    voucherNo,
    guid,
    enrollmentId: enrollment._id,
    semester,
    payDueDate,
    fineDueDate,
    fineTypeId: fineTypeId || null,
    baseAmount,
    totalAmount: baseAmount,
  });

  await VoucherItem.insertMany(resolvedItems.map((i) => ({ ...i, voucherId: voucher._id })));

  return voucher;
}

// BULK CREATE — poori Batch (Class) ke sab students ki voucher ek sath
export const bulkCreateVoucherForBatch = async (req, res) => {
  try {
    const { batchId, semester, payDueDate, fineDueDate, fineTypeId, includeTransport, transportFeeTypeId, customItems } = req.body;

    if (!batchId || !semester || !payDueDate || !fineDueDate) {
      return res.status(400).json({
        success: false,
        message: "batchId, semester, payDueDate and fineDueDate are required",
      });
    }

    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(400).json({ success: false, message: "Invalid batchId" });
    }

    const enrollments = await Enrollment.find({ batchId, status: "active" }).populate("batchId");

    const results = { created: [], skipped: [], failed: [] };

    for (const enrollment of enrollments) {
      const alreadyExists = await Voucher.findOne({ enrollmentId: enrollment._id, semester });
      if (alreadyExists) {
        results.skipped.push({ enrollmentId: enrollment._id, reason: "Voucher already exists for this semester" });
        continue;
      }
      try {
        const voucher = await buildVoucherForEnrollment(enrollment, {
          semester, payDueDate, fineDueDate, fineTypeId, includeTransport, transportFeeTypeId, customItems,
        });
        results.created.push({ enrollmentId: enrollment._id, voucherId: voucher._id, voucherNo: voucher.voucherNo });
      } catch (err) {
        results.failed.push({ enrollmentId: enrollment._id, reason: err.message });
      }
    }

    res.status(201).json({
      success: true,
      message: `${results.created.length} vouchers created, ${results.skipped.length} skipped, ${results.failed.length} failed`,
      data: results,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: cleanErrorMessage(err) });
  }
};

// BULK CREATE — poore Department ke sab Batches ke sab students ki voucher ek sath
export const bulkCreateVoucherForDepartment = async (req, res) => {
  try {
    const { departmentId, semester, payDueDate, fineDueDate, fineTypeId, includeTransport, transportFeeTypeId, customItems } = req.body;

    if (!departmentId || !semester || !payDueDate || !fineDueDate) {
      return res.status(400).json({
        success: false,
        message: "departmentId, semester, payDueDate and fineDueDate are required",
      });
    }

    const batches = await Batch.find({ departmentId, status: "ongoing" });
    if (batches.length === 0) {
      return res.status(400).json({ success: false, message: "No ongoing batches found for this department" });
    }

    const batchIds = batches.map((b) => b._id);
    const enrollments = await Enrollment.find({ batchId: { $in: batchIds }, status: "active" }).populate("batchId");

    const results = { created: [], skipped: [], failed: [] };

    for (const enrollment of enrollments) {
      const alreadyExists = await Voucher.findOne({ enrollmentId: enrollment._id, semester });
      if (alreadyExists) {
        results.skipped.push({ enrollmentId: enrollment._id, reason: "Voucher already exists for this semester" });
        continue;
      }
      try {
        const voucher = await buildVoucherForEnrollment(enrollment, {
          semester, payDueDate, fineDueDate, fineTypeId, includeTransport, transportFeeTypeId, customItems,
        });
        results.created.push({ enrollmentId: enrollment._id, voucherId: voucher._id, voucherNo: voucher.voucherNo });
      } catch (err) {
        results.failed.push({ enrollmentId: enrollment._id, reason: err.message });
      }
    }

    res.status(201).json({
      success: true,
      message: `${results.created.length} vouchers created, ${results.skipped.length} skipped, ${results.failed.length} failed across ${batches.length} batches`,
      data: results,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: cleanErrorMessage(err) });
  }
};

// REPORT — ek Batch+Semester ke sab enrolled students, kiski voucher ban chuki hai kiski nahi
export const getVoucherStatusReport = async (req, res) => {
  try {
    const { batchId, semester } = req.query;
    if (!batchId || !semester) {
      return res.status(400).json({ success: false, message: "batchId and semester are required" });
    }

    const enrollments = await Enrollment.find({ batchId, status: "active" })
      .populate("studentId", "firstName lastName cnic rollNo registrationNo");

    const enrollmentIds = enrollments.map((e) => e._id);
    const vouchers = await Voucher.find({ enrollmentId: { $in: enrollmentIds }, semester });

    const voucherMap = new Map(vouchers.map((v) => [v.enrollmentId.toString(), v]));

    const result = enrollments.map((enr) => {
      const voucher = voucherMap.get(enr._id.toString());
      return {
        enrollmentId: enr._id,
        student: enr.studentId,
        voucherCreated: !!voucher,
        voucherId: voucher?._id || null,
        payStatus: voucher?.payStatus || null,
      };
    });

    res.json({
      success: true,
      data: {
        totalStudents: result.length,
        vouchersCreated: result.filter((r) => r.voucherCreated).length,
        vouchersPending: result.filter((r) => !r.voucherCreated).length,
        students: result,
      },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: cleanErrorMessage(err) });
  }
};

// DELETE VOUCHER (+ its items)
export const deleteVoucher = async (req, res) => {
  try {
    const voucher = await Voucher.findByIdAndDelete(req.params.id);
    if (!voucher) {
      return res.status(404).json({ success: false, message: "Voucher not found" });
    }
    await VoucherItem.deleteMany({ voucherId: voucher._id });
    res.json({ success: true, message: "Voucher deleted" });
  } catch (err) {
    res.status(400).json({ success: false, message: cleanErrorMessage(err) });
  }
};