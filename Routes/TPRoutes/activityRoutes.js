import express from 'express';
import {
  createActivity,
  getClassActivities,
  getActivityById,
  updateActivity,
  deleteActivity,
  togglePublishActivity,
  getActivityStats
} from '../../Controllers/Teacher/activityController.js';
import { protectFaculty } from '../../Middleware/facultyAuth.js';

const router = express.Router();

// All routes require faculty authentication
router.use(protectFaculty);

router.post('/', createActivity);
router.get('/class/:classId', getClassActivities);
router.get('/:id', getActivityById);
router.put('/:id', updateActivity);
router.delete('/:id', deleteActivity);
router.patch('/:id/publish', togglePublishActivity);
router.get('/:id/stats', getActivityStats);

export default router;