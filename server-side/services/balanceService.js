import redis from '../config/redis.js';
import pool from '../config/database.js';


export const getUserGroupBalance = async (userId, groupId) => {
    try {
        const cacheKey = `balance:user:${userId}:group:${groupId}`;
        const cachedBalance = await redis.get(cacheKey);

        if (cachedBalance !== null) {
            return parseFloat(cachedBalance);
        }

        const result = await pool.query(
            `SELECT 
                (
                    COALESCE((
                        -- Total paid by user in expenses (positive contribution)
                        SELECT COALESCE(SUM(amount), 0)
                        FROM expenses
                        WHERE group_id = $2 AND paid_by = $1
                    ), 0) +
                    COALESCE((
                        -- Settlements paid by user (increases what you paid, reduces debt)
                        SELECT COALESCE(SUM(amount), 0)
                        FROM settlements
                        WHERE group_id = $2 AND paid_by = $1
                    ), 0)
                ) -
                (
                    COALESCE((
                        -- Total owed by user (from expense_splits)
                        SELECT COALESCE(SUM(es.amount), 0)
                        FROM expense_splits es
                        INNER JOIN expenses e ON es.expense_id = e.id
                        WHERE e.group_id = $2 AND es.user_id = $1
                    ), 0) +
                    COALESCE((
                        -- Settlements received by user (increases what you're owed, reduces positive balance)
                        SELECT COALESCE(SUM(amount), 0)
                        FROM settlements
                        WHERE group_id = $2 AND paid_to = $1
                    ), 0)
                ) as net_balance`,
            [userId, groupId]
        );

        const balance = parseFloat(result.rows[0]?.net_balance || 0);

        await redis.setex(cacheKey, 300, balance.toString());

        return balance;
    } catch (error) {
        console.error('Error getting user group balance:', error);
        if (error.code === '42P01') {
            return 0;
        }
        throw error;
    }
};

export const canUserLeaveGroup = async (userId, groupId) => {
    try {
        const balance = await getUserGroupBalance(userId, groupId);

        if (balance !== 0) {
            const balanceText = balance > 0 
                ? `You are owed ₹${Math.abs(balance).toFixed(2)}`
                : `You owe ₹${Math.abs(balance).toFixed(2)}`;
            
            return {
                canLeave: false,
                balance,
                error: `Cannot leave group. ${balanceText}. Please settle all dues first.`,
            };
        }

        return {
            canLeave: true,
            balance: 0,
        };
    } catch (error) {
        console.error('Error checking if user can leave group:', error);
        throw error;
    }
};

export const invalidateBalanceCache = async (userId, groupId) => {
    try {
        const cacheKey = `balance:user:${userId}:group:${groupId}`;
        await redis.del(cacheKey);
    } catch (error) {
        console.error('Error invalidating balance cache:', error);
    }
};

export const invalidateBalanceCacheForUsers = async (userIds, groupId) => {
    try {
        const promises = userIds.map(userId => 
            invalidateBalanceCache(userId, groupId)
        );
        await Promise.all(promises);
    } catch (error) {
        console.error('Error invalidating balance cache for users:', error);
    }
};

export const invalidateGroupBalanceCache = async (groupId) => {
    try {
        const cacheKey = `balance:group:${groupId}`;
        await redis.del(cacheKey);
    } catch (error) {
        console.error('Error invalidating group balance cache:', error);
    }
};

export const getGroupBalances = async (groupId) => {
    try {
        const membersResult = await pool.query(
            `SELECT user_id FROM group_members WHERE group_id = $1`,
            [groupId]
        );

        const members = membersResult.rows.map(row => row.user_id);
        const balances = [];

        for (const userId of members) {
            const balance = await getUserGroupBalance(userId, groupId);
            balances.push({
                userId,
                balance: parseFloat(balance.toFixed(2))
            });
        }

        return balances;
    } catch (error) {
        console.error('Error getting group balances:', error);
        throw error;
    }
};

export const getSimplifiedBalances = async (groupId) => {
    try {
        const balances = await getGroupBalances(groupId);
        
        const creditors = balances
            .filter(b => b.balance > 0)
            .sort((a, b) => b.balance - a.balance);
        
        const debtors = balances
            .filter(b => b.balance < 0)
            .sort((a, b) => a.balance - b.balance);

        const simplified = [];

        let creditorIndex = 0;
        let debtorIndex = 0;

        while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
            const creditor = creditors[creditorIndex];
            const debtor = debtors[debtorIndex];

            const settlementAmount = Math.min(
                Math.abs(creditor.balance),
                Math.abs(debtor.balance)
            );

            simplified.push({
                from: debtor.userId,
                to: creditor.userId,
                amount: parseFloat(settlementAmount.toFixed(2))
            });

            creditor.balance -= settlementAmount;
            debtor.balance += settlementAmount;

            if (Math.abs(creditor.balance) < 0.01) {
                creditorIndex++;
            }
            if (Math.abs(debtor.balance) < 0.01) {
                debtorIndex++;
            }
        }

        return simplified.filter(s => s.amount > 0);
    } catch (error) {
        console.error('Error getting simplified balances:', error);
        throw error;
    }
};

