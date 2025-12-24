import pool from '../config/database.js';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';


export const findUserByEmail = async (email) => {
    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email.toLowerCase()]
        );
        return result.rows[0] || null;
    } catch (error) {
        console.error('Error finding user:', error);
        throw error;
    }
};

export const createUser = async (email, name = null) => {
    try {
        const userId = uuidv4();
        const result = await pool.query(
            `INSERT INTO users (id, email, name, email_verified, created_at, updated_at)
             VALUES ($1, $2, $3, $4, NOW(), NOW())
             RETURNING *`,
            [userId, email.toLowerCase(), name, true]
        );
        return result.rows[0];
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
};

export const updateUser = async (email, updates) => {
    try {
        const fields = [];
        const values = [];
        let paramIndex = 1;

        Object.keys(updates).forEach((key) => {
            if (updates[key] !== undefined) {
                fields.push(`${key} = $${paramIndex}`);
                values.push(updates[key]);
                paramIndex++;
            }
        });

        if (fields.length === 0) {
            return await findUserByEmail(email);
        }

        fields.push(`updated_at = NOW()`);
        values.push(email.toLowerCase());

        const query = `
            UPDATE users 
            SET ${fields.join(', ')}
            WHERE email = $${paramIndex}
            RETURNING *
        `;

        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (error) {
        console.error('Error updating user:', error);
        throw error;
    }
};

export const generateToken = (user) => {
    const payload = {
        userId: user.id,
        email: user.email,
        emailVerified: user.email_verified,
    };

    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRY,
    });
};

export const verifyToken = async (token) => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded;
    } catch (error) {
        console.error('Token verification error:', error);
        return null;
    }
};

export const loginUser = async (email) => {
    try {
        let user = await findUserByEmail(email);

        if (!user) {
            throw new Error('User not found. Please register first.');
        }

        if (!user.email_verified) {
            user = await updateUser(email, { email_verified: true });
        }
        
        console.log(`✅ User logged in: ${email}`);

        const token = generateToken(user);

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                email_verified: user.email_verified,
                created_at: user.created_at,
            },
            token,
        };
    } catch (error) {
        console.error('Error in loginUser:', error);
        throw error;
    }
};

export const registerUser = async (email, name) => {
    try {
        const existingUser = await findUserByEmail(email);
        
        if (existingUser) {
            throw new Error('User already exists. Please login instead.');
        }

        const user = await createUser(email, name);
        console.log(`✅ New user created: ${email}`);

        const token = generateToken(user);

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                email_verified: user.email_verified,
                created_at: user.created_at,
            },
            token,
        };
    } catch (error) {
        console.error('Error in registerUser:', error);
        throw error;
    }
};

