import express from 'express'
import uploadCoordinatorFiles from '../../Middleware/Multer.js'
import {registerCoordinator , sendCoordCredentials} from '../../Controllers/Admin/CRUDCoord.js'

const router = express.Router();

router.post('/register',uploadCoordinatorFiles,registerCoordinator);
router.post('/send-credential',sendCoordCredentials);

export default router;
