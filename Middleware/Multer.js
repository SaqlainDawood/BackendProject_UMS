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


const facultyStorage = new CloudinaryStorage({
  cloudinary,
  params:{
    folder:"Faculty_Image",
    allowed_formats:["jpg" , "jpeg" , "png"],
  }
})

export const uploadFacultyImage = multer({storage:facultyStorage});