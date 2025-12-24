import pool from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const initDatabase = async () => {
    try {
        console.log('🔄 Initializing database tables...');

        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        await pool.query(schema);

        console.log('✅ Database tables created successfully!');
        console.log('📋 Created tables:');
        console.log('   - groups');
        console.log('   - group_members');
        console.log('   - group_invites');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error initializing database:', error);
        process.exit(1);
    }
};

initDatabase();

