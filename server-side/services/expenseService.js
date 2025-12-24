import pool from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { invalidateBalanceCacheForUsers, invalidateGroupBalanceCache } from './balanceService.js';
import { isGroupMember } from './groupService.js';


const validateSplits = (splitType, totalAmount, splits) => {
    if (!splits || splits.length === 0) {
        return { valid: false, error: 'At least one participant is required' };
    }

    if (splitType === 'EQUAL') {
        return { valid: true };
    }

    if (splitType === 'EXACT') {
        const totalSplit = splits.reduce((sum, split) => sum + parseFloat(split.amount || 0), 0);
        const difference = Math.abs(totalAmount - totalSplit);
        
        if (difference > 0.01) {
            return {
                valid: false,
                error: `Sum of exact amounts (${totalSplit.toFixed(2)}) must equal expense amount (${totalAmount.toFixed(2)})`
            };
        }
        return { valid: true };
    }

    if (splitType === 'PERCENTAGE') {
        const totalPercentage = splits.reduce((sum, split) => sum + parseFloat(split.percentage || 0), 0);
        
        if (Math.abs(totalPercentage - 100) > 0.01) {
            return {
                valid: false,
                error: `Sum of percentages (${totalPercentage.toFixed(2)}%) must equal 100%`
            };
        }

        for (const split of splits) {
            const expectedAmount = (totalAmount * parseFloat(split.percentage)) / 100;
            const actualAmount = parseFloat(split.amount || 0);
            const difference = Math.abs(expectedAmount - actualAmount);
            
            if (difference > 0.01) {
                return {
                    valid: false,
                    error: `Amount for user ${split.userId} doesn't match percentage`
                };
            }
        }
        return { valid: true };
    }

    return { valid: false, error: 'Invalid split type' };
};

const calculateEqualSplits = (totalAmount, participants) => {
    const perPerson = totalAmount / participants.length;
    const splits = [];
    let remainder = totalAmount - (perPerson * participants.length);

    participants.forEach((userId, index) => {
        let amount = perPerson;
        if (index === 0) {
            amount += remainder;
        }
        splits.push({
            userId,
            amount: parseFloat(amount.toFixed(2))
        });
    });

    return splits;
};

export const createExpense = async (expenseData) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        const { groupId, paidBy, amount, description, splitType, splits, expenseDate, createdBy } = expenseData;

        const isMember = await isGroupMember(paidBy, groupId);
        if (!isMember) {
            throw new Error('User who paid must be a member of the group');
        }

        let finalSplits = splits;
        if (splitType === 'EQUAL') {
            const participantIds = splits.map(s => s.userId);
            finalSplits = calculateEqualSplits(amount, participantIds);
        }

        const validation = validateSplits(splitType, amount, finalSplits);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        for (const split of finalSplits) {
            const isParticipantMember = await isGroupMember(split.userId, groupId);
            if (!isParticipantMember) {
                throw new Error(`User ${split.userId} is not a member of this group`);
            }
        }

        const expenseId = uuidv4();
        const expenseResult = await client.query(
            `INSERT INTO expenses (id, group_id, paid_by, amount, description, expense_date, split_type, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [expenseId, groupId, paidBy, amount, description || null, expenseDate || new Date(), splitType, createdBy]
        );

        const expense = expenseResult.rows[0];

        const affectedUserIds = new Set([paidBy]);
        for (const split of finalSplits) {
            affectedUserIds.add(split.userId);
            
            await client.query(
                `INSERT INTO expense_splits (id, expense_id, user_id, amount, percentage)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    uuidv4(),
                    expenseId,
                    split.userId,
                    split.amount,
                    split.percentage || null
                ]
            );
        }

        await client.query('COMMIT');

        await invalidateBalanceCacheForUsers(Array.from(affectedUserIds), groupId);
        await invalidateGroupBalanceCache(groupId);

        return expense;
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating expense:', error);
        throw error;
    } finally {
        client.release();
    }
};

export const getGroupExpenses = async (groupId, limit = 50, offset = 0) => {
    try {
        const result = await pool.query(
            `SELECT 
                e.*,
                u_paid.email as paid_by_email,
                u_paid.name as paid_by_name,
                u_created.email as created_by_email,
                u_created.name as created_by_name
             FROM expenses e
             LEFT JOIN users u_paid ON e.paid_by = u_paid.id
             LEFT JOIN users u_created ON e.created_by = u_created.id
             WHERE e.group_id = $1
             ORDER BY e.expense_date DESC, e.created_at DESC
             LIMIT $2 OFFSET $3`,
            [groupId, limit, offset]
        );

        const expenses = result.rows;

        for (const expense of expenses) {
            const splitsResult = await pool.query(
                `SELECT 
                    es.*,
                    u.email as user_email,
                    u.name as user_name
                 FROM expense_splits es
                 LEFT JOIN users u ON es.user_id = u.id
                 WHERE es.expense_id = $1
                 ORDER BY es.amount DESC`,
                [expense.id]
            );
            expense.splits = splitsResult.rows;
        }

        return expenses;
    } catch (error) {
        console.error('Error getting group expenses:', error);
        throw error;
    }
};

export const getExpenseById = async (expenseId) => {
    try {
        const result = await pool.query(
            `SELECT 
                e.*,
                u_paid.email as paid_by_email,
                u_paid.name as paid_by_name,
                u_created.email as created_by_email,
                u_created.name as created_by_name
             FROM expenses e
             LEFT JOIN users u_paid ON e.paid_by = u_paid.id
             LEFT JOIN users u_created ON e.created_by = u_created.id
             WHERE e.id = $1`,
            [expenseId]
        );

        if (result.rows.length === 0) {
            return null;
        }

        const expense = result.rows[0];

        const splitsResult = await pool.query(
            `SELECT 
                es.*,
                u.email as user_email,
                u.name as user_name
             FROM expense_splits es
             LEFT JOIN users u ON es.user_id = u.id
             WHERE es.expense_id = $1`,
            [expenseId]
        );
        expense.splits = splitsResult.rows;

        return expense;
    } catch (error) {
        console.error('Error getting expense:', error);
        throw error;
    }
};

export const updateExpense = async (expenseId, updates, userId) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        const existingExpense = await getExpenseById(expenseId);
        if (!existingExpense) {
            throw new Error('Expense not found');
        }

        if (existingExpense.created_by !== userId) {
            const { isGroupAdmin } = await import('./groupService.js');
            const isAdmin = await isGroupAdmin(userId, existingExpense.group_id);
            if (!isAdmin) {
                throw new Error('Only expense creator or group admin can update expense');
            }
        }

        if (updates.amount || updates.splits || updates.splitType) {
            const amount = updates.amount || existingExpense.amount;
            const splitType = updates.splitType || existingExpense.split_type;
            let splits = updates.splits;

            if (splitType === 'EQUAL' && splits) {
                const participantIds = splits.map(s => s.userId);
                splits = calculateEqualSplits(amount, participantIds);
            }

            const validation = validateSplits(splitType, amount, splits);
            if (!validation.valid) {
                throw new Error(validation.error);
            }

            await client.query(
                'DELETE FROM expense_splits WHERE expense_id = $1',
                [expenseId]
            );

            const affectedUserIds = new Set([existingExpense.paid_by]);
            for (const split of splits) {
                affectedUserIds.add(split.userId);
                
                await client.query(
                    `INSERT INTO expense_splits (id, expense_id, user_id, amount, percentage)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [
                        uuidv4(),
                        expenseId,
                        split.userId,
                        split.amount,
                        split.percentage || null
                    ]
                );
            }

            await invalidateBalanceCacheForUsers(Array.from(affectedUserIds), existingExpense.group_id);
        }

        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;

        if (updates.description !== undefined) {
            updateFields.push(`description = $${paramIndex}`);
            updateValues.push(updates.description);
            paramIndex++;
        }
        if (updates.amount !== undefined) {
            updateFields.push(`amount = $${paramIndex}`);
            updateValues.push(updates.amount);
            paramIndex++;
        }
        if (updates.expenseDate !== undefined) {
            updateFields.push(`expense_date = $${paramIndex}`);
            updateValues.push(updates.expenseDate);
            paramIndex++;
        }
        if (updates.splitType !== undefined) {
            updateFields.push(`split_type = $${paramIndex}`);
            updateValues.push(updates.splitType);
            paramIndex++;
        }

        if (updateFields.length > 0) {
            updateValues.push(expenseId);
            await client.query(
                `UPDATE expenses 
                 SET ${updateFields.join(', ')}
                 WHERE id = $${paramIndex}
                 RETURNING *`,
                updateValues
            );
        }

        await client.query('COMMIT');

        await invalidateGroupBalanceCache(existingExpense.group_id);

        return await getExpenseById(expenseId);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating expense:', error);
        throw error;
    } finally {
        client.release();
    }
};

export const deleteExpense = async (expenseId, userId) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        const existingExpense = await getExpenseById(expenseId);
        if (!existingExpense) {
            throw new Error('Expense not found');
        }

        if (existingExpense.created_by !== userId) {
            const { isGroupAdmin } = await import('./groupService.js');
            const isAdmin = await isGroupAdmin(userId, existingExpense.group_id);
            if (!isAdmin) {
                throw new Error('Only expense creator or group admin can delete expense');
            }
        }

        const splitsResult = await client.query(
            'SELECT user_id FROM expense_splits WHERE expense_id = $1',
            [expenseId]
        );
        const affectedUserIds = new Set([existingExpense.paid_by]);
        splitsResult.rows.forEach(row => affectedUserIds.add(row.user_id));

        await client.query(
            'DELETE FROM expenses WHERE id = $1',
            [expenseId]
        );

        await client.query('COMMIT');

        await invalidateBalanceCacheForUsers(Array.from(affectedUserIds), existingExpense.group_id);
        await invalidateGroupBalanceCache(existingExpense.group_id);

        return { success: true, message: 'Expense deleted successfully' };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting expense:', error);
        throw error;
    } finally {
        client.release();
    }
};

