import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { verifyGroupMember } from '../middleware/groupMiddleware.js';
import {
    createSettlement,
    getGroupSettlements,
    getSettlementById,
    deleteSettlement
} from '../services/settlementService.js';

const router = express.Router();

router.post('/', authenticateToken, async (req, res) => {
    try {
        const { groupId, paidBy, paidTo, amount, settlementDate, notes } = req.body;
        const userId = req.user.userId;

        if (!groupId || !paidBy || !paidTo || !amount) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: groupId, paidBy, paidTo, amount'
            });
        }

        if (amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Amount must be greater than 0'
            });
        }

        if (paidBy === paidTo) {
            return res.status(400).json({
                success: false,
                message: 'Cannot settle with yourself'
            });
        }

        const settlement = await createSettlement({
            groupId,
            paidBy,
            paidTo,
            amount: parseFloat(amount),
            settlementDate: settlementDate ? new Date(settlementDate) : new Date(),
            notes
        });

        return res.status(201).json({
            success: true,
            message: 'Settlement created successfully',
            settlement
        });
    } catch (error) {
        console.error('Error creating settlement:', error);
        return res.status(400).json({
            success: false,
            message: error.message || 'Failed to create settlement'
        });
    }
});

router.get('/group/:groupId', authenticateToken, verifyGroupMember, async (req, res) => {
    try {
        const { groupId } = req.params;
        const { limit = 50, offset = 0 } = req.query;

        const settlements = await getGroupSettlements(
            groupId,
            parseInt(limit),
            parseInt(offset)
        );

        return res.status(200).json({
            success: true,
            settlements,
            count: settlements.length
        });
    } catch (error) {
        console.error('Error getting group settlements:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to get settlements'
        });
    }
});

router.get('/:settlementId', authenticateToken, async (req, res) => {
    try {
        const { settlementId } = req.params;

        const settlement = await getSettlementById(settlementId);

        if (!settlement) {
            return res.status(404).json({
                success: false,
                message: 'Settlement not found'
            });
        }

        const { isGroupMember } = await import('../services/groupService.js');
        const isMember = await isGroupMember(req.user.userId, settlement.group_id);
        
        if (!isMember) {
            return res.status(403).json({
                success: false,
                message: 'You are not a member of this group'
            });
        }

        return res.status(200).json({
            success: true,
            settlement
        });
    } catch (error) {
        console.error('Error getting settlement:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to get settlement'
        });
    }
});

router.delete('/:settlementId', authenticateToken, async (req, res) => {
    try {
        const { settlementId } = req.params;
        const userId = req.user.userId;

        const result = await deleteSettlement(settlementId, userId);

        return res.status(200).json({
            success: true,
            message: result.message
        });
    } catch (error) {
        console.error('Error deleting settlement:', error);
        return res.status(400).json({
            success: false,
            message: error.message || 'Failed to delete settlement'
        });
    }
});

export default router;

