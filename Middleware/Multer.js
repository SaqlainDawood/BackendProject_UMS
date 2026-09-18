import multer from "multer";
import cloudinary from "../Cloudinary/CloudConnect.js";
import { CloudinaryStorage } from "multer-storage-cloudinary";

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "Student_Profile",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});

export const upload = multer({
  storage,
});

// Marksheet storage
const marksheetStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const extension = file.originalname
      .split(".")
      .pop()
      .toLowerCase();

    const cleanName = file.originalname
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9-_]/g, "-");

    return {
      folder: "Student_Marksheets",
      resource_type: "raw",
      public_id: `${Date.now()}-${cleanName}`,
      format: extension,
    };
  },
});

const marksheetFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  const allowedExtensions = [".pdf", ".doc", ".docx"];

  const extension = file.originalname
    .toLowerCase()
    .slice(file.originalname.lastIndexOf("."));

  if (
    allowedMimeTypes.includes(file.mimetype) &&
    allowedExtensions.includes(extension)
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid marksheet file. Only PDF, DOC and DOCX files are allowed."
      ),
      false
    );
  }
};

export const uploadMarksheet = multer({
  storage: marksheetStorage,
  fileFilter: marksheetFileFilter,
});

// Activity files storage
const activityStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "Activity_Files",
    allowed_formats: [
      "jpg",
      "jpeg",
      "png",
      "pdf",
      "ppt",
      "pptx",
      "doc",
      "docx",
      "zip",
    ],
  },
});

export const uploadActivityFiles = multer({
  storage: activityStorage,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
}).array("attachments", 10);

// Assignment submissions storage
const submissionStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "Student_Submissions",
    allowed_formats: [
      "jpg",
      "jpeg",
      "png",
      "pdf",
      "doc",
      "docx",
      "zip",
    ],
  },
});

export const uploadSubmission = multer({
  storage: submissionStorage,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
}).single("file");

const facultyStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "Faculty_Image",
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});

export const uploadFacultyImage = multer({
  storage: facultyStorage,
});

const coordinatorStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "Coordinator_Uploads",
    allowed_formats: ["jpg", "jpeg", "png", "pdf"],
  },
});

const uploadCoordinatorFiles = multer({
  storage: coordinatorStorage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
}).fields([
  {
    name: "profileImage",
    maxCount: 1,
  },
  {
    name: "degreeCertificate",
    maxCount: 1,
  },
]);

export default uploadCoordinatorFiles;