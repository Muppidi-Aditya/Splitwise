import cron from 'node-cron';
import { sendDebtReminders } from '../services/reminderService.js';


let reminderJob = null;

export const startReminderJob = () => {
    if (reminderJob) {
        console.log('⚠️  Reminder job is already running');
        return;
    }

    reminderJob = cron.schedule('30 18 */3 * *', async () => {
        console.log('⏰ Reminder job triggered at', new Date().toISOString());
        try {
            await sendDebtReminders();
        } catch (error) {
            console.error('❌ Error in reminder job:', error);
        }
    }, {
        scheduled: true,
        timezone: process.env.TZ || 'Asia/Kolkata'
    });

    console.log('✅ Reminder job scheduled: Every 3 days at 6:30 PM');
    console.log('   Timezone:', process.env.TZ || 'Asia/Kolkata');
};

export const stopReminderJob = () => {
    if (reminderJob) {
        reminderJob.stop();
        reminderJob = null;
        console.log('🛑 Reminder job stopped');
    }
};

export const runReminderJobNow = async () => {
    console.log('🚀 Running reminder job immediately...');
    try {
        const result = await sendDebtReminders();
        console.log('✅ Reminder job completed:', result);
        return result;
    } catch (error) {
        console.error('❌ Error running reminder job:', error);
        throw error;
    }
};

