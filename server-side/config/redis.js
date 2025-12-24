import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';

dotenv.config();

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

redis.ping()
    .then(() => console.log('✅ Connected to Upstash Redis'))
    .catch((err) => console.error('❌ Redis connection error:', err));

export default redis;

