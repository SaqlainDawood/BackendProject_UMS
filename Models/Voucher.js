import mongoose from "mongoose";

const voucherSchema = new mongoose.Schema(
  {
    voucherNo: { type: String, unique: true },
    guid: { type: String, unique: true },
    enrollmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Enrollment", required: true },
    semester: { type: Number, required: true }, // is voucher ka taluq kis semester se hai

    issueDate: { type: Date, default: Date.now },
    payDueDate: { type: Date, required: true },   // is date tak bina fine pay karo
    fineDueDate: { type: Date, required: true },  // is date ke baad fine lagni shuru

    fineTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "FineType" }, // optional

    baseAmount: { type: Number, default: 0 },   // items ka total (fine ke bagair)
    totalAmount: { type: Number, default: 0 },  // baseAmount + fine (paid hote waqt freeze hota hai)

    payStatus: { type: String, enum: ["unpaid", "paid", "cancelled"], default: "unpaid" },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

// ek enrollment ki ek semester ki sirf ek voucher ho
voucherSchema.index({ enrollmentId: 1, semester: 1 }, { unique: true });

const Voucher = mongoose.models.Voucher || mongoose.model("Voucher", voucherSchema);
export default Voucher;