
import dotenv from 'dotenv';
import { runReminderJobNow } from '../jobs/reminderJob.js';

dotenv.config();

async function main() {
    try {
        console.log('🚀 Starting manual reminder job execution...\n');
        
        const result = await runReminderJobNow();
        
        console.log('\n✅ Job completed successfully!');
        console.log('📊 Results:', result);
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error running reminder job:', error);
        process.exit(1);
    }
}

main();

