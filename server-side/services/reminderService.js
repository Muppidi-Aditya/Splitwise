import pool from '../config/database.js';
import { getUserGroupBalance, getSimplifiedBalances } from './balanceService.js';
import { sendReminderEmail } from './emailService.js';


export const getUsersWithDebts = async () => {
    try {
        const groupsResult = await pool.query('SELECT id, name FROM groups');
        const groups = groupsResult.rows;

        const usersResult = await pool.query('SELECT id, email, name FROM users WHERE email_verified = true');
        const users = usersResult.rows;

        const usersWithDebts = [];

        for (const user of users) {
            const userDebts = [];

            for (const group of groups) {
                try {
                    const balance = await getUserGroupBalance(user.id, group.id);

                    if (balance < -0.01) {
                        const simplifiedBalances = await getSimplifiedBalances(group.id);
                        const userDebtsInGroup = simplifiedBalances.filter(
                            b => b.from === user.id
                        );

                        if (userDebtsInGroup.length > 0) {
                            const debtsWithNames = await Promise.all(
                                userDebtsInGroup.map(async (debt) => {
                                    const toUserResult = await pool.query(
                                        'SELECT name, email FROM users WHERE id = $1',
                                        [debt.to]
                                    );
                                    const toUser = toUserResult.rows[0];
                                    return {
                                        ...debt,
                                        toName: toUser?.name || toUser?.email || 'User'
                                    };
                                })
                            );

                            userDebts.push({
                                groupId: group.id,
                                groupName: group.name,
                                balance: balance,
                                debts: debtsWithNames
                            });
                        }
                    }
                } catch (error) {
                    console.error(`Error getting balance for user ${user.id} in group ${group.id}:`, error);
                }
            }

            if (userDebts.length > 0) {
                usersWithDebts.push({
                    userId: user.id,
                    email: user.email,
                    name: user.name,
                    debts: userDebts
                });
            }
        }

        return usersWithDebts;
    } catch (error) {
        console.error('Error getting users with debts:', error);
        throw error;
    }
};

export const sendDebtReminders = async () => {
    try {
        console.log('📧 Starting debt reminder job...');
        
        const usersWithDebts = await getUsersWithDebts();
        
        if (usersWithDebts.length === 0) {
            console.log('✅ No users with debts. No reminders to send.');
            return { sent: 0, failed: 0 };
        }

        let sent = 0;
        let failed = 0;

        for (const user of usersWithDebts) {
            try {
                await sendReminderEmail(user.email, user.name, user.debts);
                sent++;
                console.log(`✅ Reminder sent to ${user.email}`);
            } catch (error) {
                failed++;
                console.error(`❌ Failed to send reminder to ${user.email}:`, error);
            }
        }

        console.log(`📧 Reminder job completed. Sent: ${sent}, Failed: ${failed}`);
        return { sent, failed };
    } catch (error) {
        console.error('Error in sendDebtReminders:', error);
        throw error;
    }
};

