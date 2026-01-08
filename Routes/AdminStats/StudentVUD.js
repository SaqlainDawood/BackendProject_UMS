import express from 'express'
import { bulkDeleteStudent, StduentUpdate, StudentDeleteById, StudentView } from '../../Controllers/Admin/StdVUDController.js';
import {protectAdmin} from '../../Middleware/adminAuth.js'
const router = express.Router();


router.get('/view/:id' ,protectAdmin,StudentView);
router.put('/update/:id' ,protectAdmin,StduentUpdate);
router.delete('/delete/:id',protectAdmin,StudentDeleteById);
router.post('/delete-bulk' , protectAdmin , bulkDeleteStudent)


export default router;