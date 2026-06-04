import multer from "multer";
import cloudinary from "../Cloudinary/CloudConnect.js";

import {CloudinaryStorage} from 'multer-storage-cloudinary'

const storage =  new CloudinaryStorage({
    cloudinary:cloudinary,
    params:{
        folder:'Student_Profile', //folder name
        allowed_formats:['jpg ' , 'jpeg' , 'png'], // formats
    },
});
export const upload = multer({storage});
// Marksheet storage
const marksheetStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    return {
      folder: "Student_Marksheets",
      allowed_formats: ["jpg", "jpeg", "png", "pdf"],
      public_id: `${Date.now()}-${file.originalname}`,
    };
  },
});
export const uploadMarksheet = multer({ storage: marksheetStorage });

// Activity files storage (for presentations and resources)
const activityStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'Activity_Files',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'ppt', 'pptx', 'doc', 'docx', 'zip'],
  }
});
export const uploadActivityFiles = multer({ 
  storage: activityStorage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
}).array('attachments', 10);

// Assignment submissions storage
const submissionStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'Student_Submissions',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx', 'zip'],
  }
});
export const uploadSubmission = multer({ 
  storage: submissionStorage,
  limits: { fileSize: 50 * 1024 * 1024 }
}).single('file');

const facultyStorage = new CloudinaryStorage({
  cloudinary,
  params:{
    folder:"Faculty_Image",
    allowed_formats:["jpg" , "jpeg" , "png"],
  }
})
export const uploadFacultyImage = multer({storage:facultyStorage});

const coordinatorStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "Coordinator_Uploads",
    allowed_formats: ["jpg", "jpeg", "png", "pdf"],
  }
});

const uploadCoordinatorFiles = multer({
  storage: coordinatorStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
}).fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'degreeCertificate', maxCount: 1 }
]);
export default uploadCoordinatorFiles