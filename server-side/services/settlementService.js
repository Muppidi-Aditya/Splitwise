import pool from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { invalidateBalanceCache, invalidateGroupBalanceCache, invalidateBalanceCacheForUsers } from './balanceService.js';
import { isGroupMember } from './groupService.js';
import { getUserGroupBalance } from './balanceService.js';


export const createSettlement = async (settlementData) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        const { groupId, paidBy, paidTo, amount, settlementDate, notes } = settlementData;

        if (paidBy === paidTo) {
            throw new Error('Cannot settle with yourself');
        }

        const paidByIsMember = await isGroupMember(paidBy, groupId);
        const paidToIsMember = await isGroupMember(paidTo, groupId);
        
        if (!paidByIsMember || !paidToIsMember) {
            throw new Error('Both users must be members of the group');
        }

        const balance = await getUserGroupBalance(paidBy, groupId);
        if (balance > 0) {
            console.warn(`Warning: User ${paidBy} is owed money but is paying settlement`);
        }

        const settlementId = uuidv4();
        const result = await client.query(
            `INSERT INTO settlements (id, group_id, paid_by, paid_to, amount, settlement_date, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [settlementId, groupId, paidBy, paidTo, amount, settlementDate || new Date(), notes || null]
        );

        await client.query('COMMIT');

        await invalidateBalanceCache(paidBy, groupId);
        await invalidateBalanceCache(paidTo, groupId);
        await invalidateGroupBalanceCache(groupId);
        
        const { getGroupMembers } = await import('./groupService.js');
        const membersResult = await getGroupMembers(groupId);
        if (membersResult && Array.isArray(membersResult) && membersResult.length > 0) {
            const memberIds = membersResult.map(m => m.user_id || m.userId).filter(Boolean);
            if (memberIds.length > 0) {
                await invalidateBalanceCacheForUsers(memberIds, groupId);
            }
        }

        return result.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating settlement:', error);
        throw error;
    } finally {
        client.release();
    }
};

export const getGroupSettlements = async (groupId, limit = 50, offset = 0) => {
    try {
        const result = await pool.query(
            `SELECT 
                s.*,
                u_paid.email as paid_by_email,
                u_paid.name as paid_by_name,
                u_received.email as paid_to_email,
                u_received.name as paid_to_name
             FROM settlements s
             LEFT JOIN users u_paid ON s.paid_by = u_paid.id
             LEFT JOIN users u_received ON s.paid_to = u_received.id
             WHERE s.group_id = $1
             ORDER BY s.settlement_date DESC, s.created_at DESC
             LIMIT $2 OFFSET $3`,
            [groupId, limit, offset]
        );

        return result.rows;
    } catch (error) {
        console.error('Error getting group settlements:', error);
        throw error;
    }
};

export const getSettlementById = async (settlementId) => {
    try {
        const result = await pool.query(
            `SELECT 
                s.*,
                u_paid.email as paid_by_email,
                u_paid.name as paid_by_name,
                u_received.email as paid_to_email,
                u_received.name as paid_to_name
             FROM settlements s
             LEFT JOIN users u_paid ON s.paid_by = u_paid.id
             LEFT JOIN users u_received ON s.paid_to = u_received.id
             WHERE s.id = $1`,
            [settlementId]
        );

        return result.rows[0] || null;
    } catch (error) {
        console.error('Error getting settlement:', error);
        throw error;
    }
};

export const deleteSettlement = async (settlementId, userId) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        const existingSettlement = await getSettlementById(settlementId);
        if (!existingSettlement) {
            throw new Error('Settlement not found');
        }

        const { isGroupAdmin } = await import('./groupService.js');
        const isAdmin = await isGroupAdmin(userId, existingSettlement.group_id);
        const isParty = existingSettlement.paid_by === userId || existingSettlement.paid_to === userId;
        
        if (!isAdmin && !isParty) {
            throw new Error('Only settlement parties or group admin can delete settlement');
        }

        await client.query(
            'DELETE FROM settlements WHERE id = $1',
            [settlementId]
        );

        await client.query('COMMIT');

        await invalidateBalanceCache(existingSettlement.paid_by, existingSettlement.group_id);
        await invalidateBalanceCache(existingSettlement.paid_to, existingSettlement.group_id);
        await invalidateGroupBalanceCache(existingSettlement.group_id);

        return { success: true, message: 'Settlement deleted successfully' };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting settlement:', error);
        throw error;
    } finally {
        client.release();
    }
};

