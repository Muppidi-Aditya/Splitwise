import { getGroupById, isGroupMember, isGroupAdmin } from '../services/groupService.js';

export const verifyGroupMember = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const userId = req.user.userId;

        const group = await getGroupById(groupId);
        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Group not found',
            });
        }

        const member = await isGroupMember(userId, groupId);
        if (!member) {
            return res.status(403).json({
                success: false,
                message: 'You are not a member of this group',
            });
        }

        req.group = group;
        next();
    } catch (error) {
        console.error('Error in verifyGroupMember:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
};

export const verifyGroupAdmin = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const userId = req.user.userId;

        const group = await getGroupById(groupId);
        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Group not found',
            });
        }

        const admin = await isGroupAdmin(userId, groupId);
        if (!admin) {
            return res.status(403).json({
                success: false,
                message: 'Only group admins can perform this action',
            });
        }

        req.group = group;
        next();
    } catch (error) {
        console.error('Error in verifyGroupAdmin:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
};

