import pool from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { canUserLeaveGroup } from './balanceService.js';


export const createGroup = async (name, createdBy) => {
    try {
        const groupId = uuidv4();
        
        const groupResult = await pool.query(
            `INSERT INTO groups (id, name, created_by, created_at)
             VALUES ($1, $2, $3, NOW())
             RETURNING *`,
            [groupId, name, createdBy]
        );

        const group = groupResult.rows[0];

        await pool.query(
            `INSERT INTO group_members (id, group_id, user_id, role, joined_at)
             VALUES ($1, $2, $3, $4, NOW())`,
            [uuidv4(), groupId, createdBy, 'admin']
        );

        return group;
    } catch (error) {
        console.error('Error creating group:', error);
        throw error;
    }
};

export const getGroupById = async (groupId) => {
    try {
        const result = await pool.query(
            'SELECT * FROM groups WHERE id = $1',
            [groupId]
        );
        return result.rows[0] || null;
    } catch (error) {
        console.error('Error getting group:', error);
        throw error;
    }
};

export const getUserGroups = async (userId) => {
    try {
        const result = await pool.query(
            `SELECT g.*, gm.role, gm.joined_at
             FROM groups g
             INNER JOIN group_members gm ON g.id = gm.group_id
             WHERE gm.user_id = $1
             ORDER BY g.created_at DESC`,
            [userId]
        );
        return result.rows;
    } catch (error) {
        console.error('Error getting user groups:', error);
        throw error;
    }
};

export const getGroupMembers = async (groupId) => {
    try {
        const result = await pool.query(
            `SELECT gm.*, u.email, u.name
             FROM group_members gm
             LEFT JOIN users u ON gm.user_id = u.id
             WHERE gm.group_id = $1
             ORDER BY gm.joined_at ASC`,
            [groupId]
        );
        return result.rows;
    } catch (error) {
        console.error('Error getting group members:', error);
        throw error;
    }
};

export const isGroupMember = async (userId, groupId) => {
    try {
        const result = await pool.query(
            'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
            [groupId, userId]
        );
        return result.rows.length > 0;
    } catch (error) {
        console.error('Error checking group membership:', error);
        throw error;
    }
};

export const isGroupAdmin = async (userId, groupId) => {
    try {
        const result = await pool.query(
            'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2 AND role = $3',
            [groupId, userId, 'admin']
        );
        return result.rows.length > 0;
    } catch (error) {
        console.error('Error checking group admin:', error);
        throw error;
    }
};

export const removeUserFromGroup = async (userId, groupId, requestedBy) => {
    try {
        const balanceCheck = await canUserLeaveGroup(userId, groupId);
        
        if (!balanceCheck.canLeave) {
            return {
                success: false,
                error: balanceCheck.error,
            };
        }

        const result = await pool.query(
            'DELETE FROM group_members WHERE group_id = $1 AND user_id = $2 RETURNING *',
            [groupId, userId]
        );

        if (result.rows.length === 0) {
            return {
                success: false,
                error: 'User is not a member of this group',
            };
        }

        return {
            success: true,
            message: 'User removed from group successfully',
        };
    } catch (error) {
        console.error('Error removing user from group:', error);
        throw error;
    }
};

export const updateGroup = async (groupId, name, userId) => {
    try {
        const isAdmin = await isGroupAdmin(userId, groupId);
        if (!isAdmin) {
            throw new Error('Only group admins can update group details');
        }

        const result = await pool.query(
            `UPDATE groups 
             SET name = $1
             WHERE id = $2
             RETURNING *`,
            [name, groupId]
        );

        return result.rows[0];
    } catch (error) {
        console.error('Error updating group:', error);
        throw error;
    }
};

