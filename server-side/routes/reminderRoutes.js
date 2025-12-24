import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { runReminderJobNow } from '../jobs/reminderJob.js';

const router = express.Router();

router.post('/run-now', authenticateToken, async (req, res) => {
    try {
        const result = await runReminderJobNow();
        
        return res.status(200).json({
            success: true,
            message: 'Reminder job executed successfully',
            result
        });
    } catch (error) {
        console.error('Error running reminder job:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to run reminder job'
        });
    }
});

export default router;

