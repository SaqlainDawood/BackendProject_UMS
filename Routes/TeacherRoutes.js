import express from 'express'
import { deleteFaculty, facultyAdd, getAllFaculties,updateFaculty ,getFacultyById} from '../Controllers/Teacher/facultyControllers.js';
import {uploadFacultyImage} from '../Middleware/Multer.js'
const router = express.Router();

router.post('/add' ,uploadFacultyImage.single("profileImage"),  facultyAdd);
router.get('/all' , getAllFaculties);
router.delete('/:id' , deleteFaculty);
router.put('/update/:id' , updateFaculty);
router.get('/view/:id' , getFacultyById);
export default router;