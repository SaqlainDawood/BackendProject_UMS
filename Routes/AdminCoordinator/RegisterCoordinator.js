import express from 'express'
import uploadCoordinatorFiles from '../../Middleware/Multer.js'
import {registerCoordinator , sendCoordCredentials ,
        getAllCoordinators, viewCoordinator,
        deleteCoordPermanently,updateCoordinator
       } from '../../Controllers/Admin/CRUDCoord.js';
import {protectAdmin} from '../../Middleware/adminAuth.js';

const router = express.Router();

router.post('/register',uploadCoordinatorFiles,registerCoordinator);
router.post('/send-credential',sendCoordCredentials);
router.get('/all',protectAdmin, getAllCoordinators);
router.get('/view/:id' , protectAdmin , viewCoordinator);
router.put('/update/:id' , protectAdmin , updateCoordinator)
router.delete('/delete/:id' , protectAdmin , deleteCoordPermanently);

export default router;
