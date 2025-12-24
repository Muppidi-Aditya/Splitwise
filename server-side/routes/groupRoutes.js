import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { verifyGroupMember, verifyGroupAdmin } from '../middleware/groupMiddleware.js';
import { createGroup, getUserGroups, getGroupMembers, removeUserFromGroup, updateGroup } from '../services/groupService.js';
import { createInvite, getPendingInvites, respondToInvite, getGroupInvites } from '../services/inviteService.js';
import pool from '../config/database.js';

const router = express.Router();

router.use(authenticateToken);

router.post('/', async (req, res) => {
    try {
        const { name } = req.body;
        const userId = req.user.userId;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Group name is required',
            });
        }

        const group = await createGroup(name.trim(), userId);

        return res.status(201).json({
            success: true,
            message: 'Group created successfully',
            group,
        });
    } catch (error) {
        console.error('Error creating group:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to create group',
        });
    }
});

router.get('/', async (req, res) => {
    try {
        const userId = req.user.userId;
        const groups = await getUserGroups(userId);

        return res.status(200).json({
            success: true,
            groups,
        });
    } catch (error) {
        console.error('Error getting user groups:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch groups',
        });
    }
});

router.get('/:groupId/members', verifyGroupMember, async (req, res) => {
    try {
        const { groupId } = req.params;
        const members = await getGroupMembers(groupId);

        return res.status(200).json({
            success: true,
            members,
        });
    } catch (error) {
        console.error('Error getting group members:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch group members',
        });
    }
});

router.post('/:groupId/invite', verifyGroupAdmin, async (req, res) => {
    try {
        const { groupId } = req.params;
        const { email } = req.body;
        const invitedBy = req.user.userId;

        if (!email || !email.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Email is required',
            });
        }

        const userResult = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email.toLowerCase().trim()]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        const invitedUserId = userResult.rows[0].id;

        if (invitedUserId === invitedBy) {
            return res.status(400).json({
                success: false,
                message: 'You cannot invite yourself',
            });
        }

        const invite = await createInvite(groupId, invitedUserId, invitedBy);

        return res.status(201).json({
            success: true,
            message: 'Invitation sent successfully',
            invite,
        });
    } catch (error) {
        console.error('Error inviting user:', error);
        return res.status(400).json({
            success: false,
            message: error.message || 'Failed to send invitation',
        });
    }
});

router.get('/invites', async (req, res) => {
    try {
        const userId = req.user.userId;
        const invites = await getPendingInvites(userId);

        return res.status(200).json({
            success: true,
            invites,
        });
    } catch (error) {
        console.error('Error getting pending invites:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch invitations',
        });
    }
});

router.post('/invites/:inviteId/respond', async (req, res) => {
    try {
        const { inviteId } = req.params;
        const { response } = req.body;
        const userId = req.user.userId;

        if (!response || !['ACCEPTED', 'REJECTED'].includes(response.toUpperCase())) {
            return res.status(400).json({
                success: false,
                message: 'Response must be ACCEPTED or REJECTED',
            });
        }

        const result = await respondToInvite(inviteId, userId, response.toUpperCase());

        return res.status(200).json({
            success: true,
            message: result.message,
        });
    } catch (error) {
        console.error('Error responding to invite:', error);
        return res.status(400).json({
            success: false,
            message: error.message || 'Failed to respond to invitation',
        });
    }
});

router.get('/:groupId/invites', verifyGroupAdmin, async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user.userId;
        const invites = await getGroupInvites(groupId, userId);

        return res.status(200).json({
            success: true,
            invites,
        });
    } catch (error) {
        console.error('Error getting group invites:', error);
        return res.status(400).json({
            success: false,
            message: error.message || 'Failed to fetch invitations',
        });
    }
});

router.post('/:groupId/leave', verifyGroupMember, async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user.userId;

        const { isGroupAdmin } = await import('../services/groupService.js');
        const isAdmin = await isGroupAdmin(userId, groupId);
        
        if (isAdmin) {
            return res.status(400).json({
                success: false,
                message: 'Group admins cannot leave the group. Please transfer admin rights or remove other members first.',
            });
        }

        const result = await removeUserFromGroup(userId, groupId, userId);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error,
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Left group successfully',
        });
    } catch (error) {
        console.error('Error leaving group:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to leave group',
        });
    }
});

router.post('/:groupId/remove-member', verifyGroupAdmin, async (req, res) => {
    try {
        const { groupId } = req.params;
        const { userId } = req.body;
        const requestedBy = req.user.userId;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required',
            });
        }

        if (userId === requestedBy) {
            return res.status(400).json({
                success: false,
                message: 'Use the leave endpoint to remove yourself',
            });
        }

        const result = await removeUserFromGroup(userId, groupId, requestedBy);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error,
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Member removed from group successfully',
        });
    } catch (error) {
        console.error('Error removing member:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to remove member',
        });
    }
});

router.put('/:groupId', verifyGroupAdmin, async (req, res) => {
    try {
        const { groupId } = req.params;
        const { name } = req.body;
        const userId = req.user.userId;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Group name is required',
            });
        }

        const group = await updateGroup(groupId, name.trim(), userId);

        return res.status(200).json({
            success: true,
            message: 'Group updated successfully',
            group,
        });
    } catch (error) {
        console.error('Error updating group:', error);
        return res.status(400).json({
            success: false,
            message: error.message || 'Failed to update group',
        });
    }
});

export default router;

