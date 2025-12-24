import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { verifyGroupMember } from '../middleware/groupMiddleware.js';
import {
    getUserGroupBalance,
    getGroupBalances,
    getSimplifiedBalances
} from '../services/balanceService.js';

const router = express.Router();

router.get('/group/:groupId/user/:userId', authenticateToken, verifyGroupMember, async (req, res) => {
    try {
        const { groupId, userId } = req.params;

        const balance = await getUserGroupBalance(userId, groupId);

        return res.status(200).json({
            success: true,
            balance: parseFloat(balance.toFixed(2)),
            userId,
            groupId
        });
    } catch (error) {
        console.error('Error getting user balance:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to get balance'
        });
    }
});

router.get('/group/:groupId', authenticateToken, verifyGroupMember, async (req, res) => {
    try {
        const { groupId } = req.params;

        const balances = await getGroupBalances(groupId);

        return res.status(200).json({
            success: true,
            balances
        });
    } catch (error) {
        console.error('Error getting group balances:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to get balances'
        });
    }
});

router.get('/group/:groupId/simplified', authenticateToken, verifyGroupMember, async (req, res) => {
    try {
        const { groupId } = req.params;

        const simplified = await getSimplifiedBalances(groupId);

        return res.status(200).json({
            success: true,
            simplified
        });
    } catch (error) {
        console.error('Error getting simplified balances:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to get simplified balances'
        });
    }
});

export default router;

