import mongoose from "mongoose";

const voucherItemSchema = new mongoose.Schema(
  {
    voucherId: { type: mongoose.Schema.Types.ObjectId, ref: "Voucher", required: true },
    type: { type: String, enum: ["tuition", "feeType", "custom"], required: true },
    refId: { type: mongoose.Schema.Types.ObjectId, default: null },
    name: { type: String, required: true },
    amount: { type: Number, required: true },
  },
  { timestamps: true }
);

const VoucherItem = mongoose.models.VoucherItem || mongoose.model("VoucherItem", voucherItemSchema);
export default VoucherItem;