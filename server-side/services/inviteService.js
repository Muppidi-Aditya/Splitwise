import pool from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { isGroupMember, isGroupAdmin } from './groupService.js';


export const createInvite = async (groupId, invitedUserId, invitedBy) => {
    try {
        const isAdmin = await isGroupAdmin(invitedBy, groupId);
        if (!isAdmin) {
            throw new Error('Only group admins can invite users');
        }

        const alreadyMember = await isGroupMember(invitedUserId, groupId);
        if (alreadyMember) {
            throw new Error('User is already a member of this group');
        }

        const existingInvite = await pool.query(
            `SELECT * FROM group_invites 
             WHERE group_id = $1 AND invited_user_id = $2 AND status = $3`,
            [groupId, invitedUserId, 'PENDING']
        );

        if (existingInvite.rows.length > 0) {
            throw new Error('User already has a pending invitation');
        }

        const inviteId = uuidv4();
        const result = await pool.query(
            `INSERT INTO group_invites (id, group_id, invited_user_id, invited_by, status, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             RETURNING *`,
            [inviteId, groupId, invitedUserId, invitedBy, 'PENDING']
        );

        return result.rows[0];
    } catch (error) {
        console.error('Error creating invite:', error);
        throw error;
    }
};

export const getPendingInvites = async (userId) => {
    try {
        const result = await pool.query(
            `SELECT gi.*, g.name as group_name, 
                    u1.email as inviter_email, u1.name as inviter_name
             FROM group_invites gi
             INNER JOIN groups g ON gi.group_id = g.id
             LEFT JOIN users u1 ON gi.invited_by = u1.id
             WHERE gi.invited_user_id = $1 AND gi.status = $2
             ORDER BY gi.created_at DESC`,
            [userId, 'PENDING']
        );
        return result.rows;
    } catch (error) {
        console.error('Error getting pending invites:', error);
        throw error;
    }
};

export const getInviteById = async (inviteId) => {
    try {
        const result = await pool.query(
            'SELECT * FROM group_invites WHERE id = $1',
            [inviteId]
        );
        return result.rows[0] || null;
    } catch (error) {
        console.error('Error getting invite:', error);
        throw error;
    }
};

export const respondToInvite = async (inviteId, userId, response) => {
    try {
        if (response !== 'ACCEPTED' && response !== 'REJECTED') {
            throw new Error('Response must be ACCEPTED or REJECTED');
        }

        const invite = await getInviteById(inviteId);
        if (!invite) {
            throw new Error('Invitation not found');
        }

        if (invite.invited_user_id !== userId) {
            throw new Error('You are not authorized to respond to this invitation');
        }

        if (invite.status !== 'PENDING') {
            throw new Error(`Invitation has already been ${invite.status.toLowerCase()}`);
        }

        await pool.query(
            `UPDATE group_invites 
             SET status = $1, responded_at = NOW()
             WHERE id = $2`,
            [response, inviteId]
        );

        if (response === 'ACCEPTED') {
            const alreadyMember = await pool.query(
                'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
                [invite.group_id, userId]
            );

            if (alreadyMember.rows.length === 0) {
                await pool.query(
                    `INSERT INTO group_members (id, group_id, user_id, role, joined_at)
                     VALUES ($1, $2, $3, $4, NOW())`,
                    [uuidv4(), invite.group_id, userId, 'member']
                );
            }
        }

        return {
            success: true,
            message: `Invitation ${response.toLowerCase()} successfully`,
        };
    } catch (error) {
        console.error('Error responding to invite:', error);
        throw error;
    }
};

export const getGroupInvites = async (groupId, userId) => {
    try {
        const isAdmin = await isGroupAdmin(userId, groupId);
        if (!isAdmin) {
            throw new Error('Only group admins can view group invitations');
        }

        const result = await pool.query(
            `SELECT gi.*, u.email as invited_user_email, u.name as invited_user_name,
                    u1.email as inviter_email, u1.name as inviter_name
             FROM group_invites gi
             LEFT JOIN users u ON gi.invited_user_id = u.id
             LEFT JOIN users u1 ON gi.invited_by = u1.id
             WHERE gi.group_id = $1
             ORDER BY gi.created_at DESC`,
            [groupId]
        );
        return result.rows;
    } catch (error) {
        console.error('Error getting group invites:', error);
        throw error;
    }
};

