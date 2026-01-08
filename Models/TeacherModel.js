import mongoose from "mongoose";

const facultySchema = new mongoose.Schema(
  {
    user:{
         type:mongoose.Schema.Types.ObjectId,
            ref:'User',
            required:true,
    },
    employeeID: { type: String, required: true, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
   
    phone: { type: String, required: true },
    cnic: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: function (v) {
          return /^\d{13}$/.test(v); // exactly 13 digits
        },
        message: (props) =>
          `${props.value} is not a valid CNIC (must be 13 digits)`,
      },
    },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, required: true, enum: ["Male", "Female", "othe"] },
    city: { type: String, required: true },
    address: { type: String, required: true },
    department: { type: String, required: true },
    designation: { type: String, required: true },
    qualification: { type: String, required: true },
    specialization: { type: String, required: true },
    experience: { type: Number, required: true },
    joiningDate: { type: Date, required: true },
    salary: { type: Number, required: true },
    accountTitle: { type: String, required: true },
    accountNumber: { type: String, required: true },
    bankName: { type: String, required: true },
    emergencyContact: { type: String, required: true },
    emergencyPerson: { type: String, required: true },
    profileImage: { type: String, required: true },
    status: {
      type: String,
      enum: ["Active", "On Leave", "Inactive"],
      default: "Active",
    },
    userName: {
      type: String,
      required: true,
      unique: true,
    },

    // password: { type: String, required: true },
    coursesAssigned: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Faculty", facultySchema);
