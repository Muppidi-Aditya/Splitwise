import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { verifyGroupMember } from '../middleware/groupMiddleware.js';
import {
    createExpense,
    getGroupExpenses,
    getExpenseById,
    updateExpense,
    deleteExpense
} from '../services/expenseService.js';

const router = express.Router();

router.post('/', authenticateToken, async (req, res) => {
    try {
        const { groupId, paidBy, amount, description, splitType, splits, expenseDate } = req.body;
        const userId = req.user.userId;

        if (!groupId || !paidBy || !amount || !splitType || !splits) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: groupId, paidBy, amount, splitType, splits'
            });
        }

        if (amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Amount must be greater than 0'
            });
        }

        const expense = await createExpense({
            groupId,
            paidBy,
            amount: parseFloat(amount),
            description,
            splitType,
            splits,
            expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
            createdBy: userId
        });

        return res.status(201).json({
            success: true,
            message: 'Expense created successfully',
            expense
        });
    } catch (error) {
        console.error('Error creating expense:', error);
        return res.status(400).json({
            success: false,
            message: error.message || 'Failed to create expense'
        });
    }
});

router.get('/group/:groupId', authenticateToken, verifyGroupMember, async (req, res) => {
    try {
        const { groupId } = req.params;
        const { limit = 50, offset = 0 } = req.query;

        const expenses = await getGroupExpenses(
            groupId,
            parseInt(limit),
            parseInt(offset)
        );

        return res.status(200).json({
            success: true,
            expenses,
            count: expenses.length
        });
    } catch (error) {
        console.error('Error getting group expenses:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to get expenses'
        });
    }
});

router.get('/:expenseId', authenticateToken, async (req, res) => {
    try {
        const { expenseId } = req.params;

        const expense = await getExpenseById(expenseId);

        if (!expense) {
            return res.status(404).json({
                success: false,
                message: 'Expense not found'
            });
        }

        const { isGroupMember } = await import('../services/groupService.js');
        const isMember = await isGroupMember(req.user.userId, expense.group_id);
        
        if (!isMember) {
            return res.status(403).json({
                success: false,
                message: 'You are not a member of this group'
            });
        }

        return res.status(200).json({
            success: true,
            expense
        });
    } catch (error) {
        console.error('Error getting expense:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to get expense'
        });
    }
});

router.put('/:expenseId', authenticateToken, async (req, res) => {
    try {
        const { expenseId } = req.params;
        const { description, amount, splitType, splits, expenseDate } = req.body;
        const userId = req.user.userId;

        const updates = {};
        if (description !== undefined) updates.description = description;
        if (amount !== undefined) updates.amount = parseFloat(amount);
        if (splitType !== undefined) updates.splitType = splitType;
        if (splits !== undefined) updates.splits = splits;
        if (expenseDate !== undefined) updates.expenseDate = new Date(expenseDate);

        const expense = await updateExpense(expenseId, updates, userId);

        return res.status(200).json({
            success: true,
            message: 'Expense updated successfully',
            expense
        });
    } catch (error) {
        console.error('Error updating expense:', error);
        return res.status(400).json({
            success: false,
            message: error.message || 'Failed to update expense'
        });
    }
});

router.delete('/:expenseId', authenticateToken, async (req, res) => {
    try {
        const { expenseId } = req.params;
        const userId = req.user.userId;

        const result = await deleteExpense(expenseId, userId);

        return res.status(200).json({
            success: true,
            message: result.message
        });
    } catch (error) {
        console.error('Error deleting expense:', error);
        return res.status(400).json({
            success: false,
            message: error.message || 'Failed to delete expense'
        });
    }
});

export default router;

