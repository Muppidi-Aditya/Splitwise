import React, { useState, useEffect, useMemo } from 'react';
import { createSettlement } from '../../services/api.js';
import './index.css';

const SettlementList = ({ groupId, simplifiedBalances, settlements, members, currentUserId, onSettlementAdded }) => {
    const [settledItems, setSettledItems] = useState(new Set());
    const [settlingItem, setSettlingItem] = useState(null);

    const existingSettlementsMap = useMemo(() => {
        const map = new Map();
        if (settlements && settlements.length > 0) {
            settlements.forEach(settlement => {
                const key = `${settlement.paid_by}-${settlement.paid_to}`;
                if (!map.has(key)) {
                    map.set(key, []);
                }
                map.get(key).push(settlement);
            });
        }
        return map;
    }, [settlements]);

    useEffect(() => {
        setSettledItems(new Set());
        setSettlingItem(null);
    }, [simplifiedBalances]);

    const formatCurrency = (amount) => {
        return `₹${parseFloat(amount).toFixed(2)}`;
    };

    const getMemberName = (userId) => {
        const member = members.find(m => m.user_id === userId);
        return member ? (member.name || member.email) : userId;
    };

    const handleSettle = async (balance) => {
        const itemKey = `${balance.from}-${balance.to}`;
        
        if (settledItems.has(itemKey) || settlingItem === itemKey) {
            return;
        }

        if (!window.confirm(`Mark this settlement as completed? ${getMemberName(balance.from)} will pay ₹${formatCurrency(balance.amount)} to ${getMemberName(balance.to)}`)) {
            return;
        }

        setSettlingItem(itemKey);
        
        try {
            const settlementData = {
                groupId,
                paidBy: balance.from,
                paidTo: balance.to,
                amount: parseFloat(balance.amount),
                settlementDate: new Date().toISOString().split('T')[0],
                notes: 'Settled via balance summary'
            };

            console.log('Creating settlement:', settlementData);
            
            await createSettlement(settlementData);

            setSettledItems(prev => new Set([...prev, itemKey]));

            if (onSettlementAdded) {
                onSettlementAdded();
            }
        } catch (error) {
            console.error('Settlement error:', error);
            alert(error.message || 'Failed to create settlement');
        } finally {
            setSettlingItem(null);
        }
    };

    const allSettlementItems = useMemo(() => {
        const items = [];
        
        if (simplifiedBalances && simplifiedBalances.length > 0) {
            simplifiedBalances.forEach(balance => {
                items.push({
                    ...balance,
                    isExisting: false,
                    settlement: null
                });
            });
        }
        
        if (settlements && settlements.length > 0) {
            settlements.forEach(settlement => {
                items.push({
                    from: settlement.paid_by,
                    to: settlement.paid_to,
                    amount: settlement.amount,
                    isExisting: true,
                    settlement: settlement
                });
            });
        }
        
        return items;
    }, [simplifiedBalances, settlements]);

    if (allSettlementItems.length === 0) {
        return (
            <div className="settlement-list-empty">
                <p>No pending settlements. Everyone is settled up! 🎉</p>
            </div>
        );
    }

    return (
        <div className="settlement-list">
            {allSettlementItems.map((item, index) => {
                const itemKey = `${item.from}-${item.to}`;
                const isSettled = settledItems.has(itemKey) || item.isExisting;
                const isSettlingThis = settlingItem === itemKey;
                const canSettle = !item.isExisting && item.to === currentUserId && !isSettled && !isSettlingThis;

                return (
                    <div 
                        key={`${item.from}-${item.to}-${index}-${item.isExisting ? 'existing' : 'pending'}`}
                        className={`settlement-item ${isSettled ? 'settled' : ''}`}
                    >
                        <div className="settlement-content">
                            <div className="settlement-info">
                                <span className="settlement-text">
                                    <strong>{getMemberName(item.from)}</strong> needs to pay{' '}
                                    <strong>{getMemberName(item.to)}</strong>
                                    {item.isExisting && item.settlement && (
                                        <span className="settlement-date-badge">
                                            {' '}(Settled {new Date(item.settlement.settlement_date).toLocaleDateString()})
                                        </span>
                                    )}
                                </span>
                                <span className="settlement-amount">
                                    {formatCurrency(item.amount)}
                                </span>
                            </div>
                            <div className="settlement-actions">
                                {canSettle && (
                                    <button
                                        className="settle-btn"
                                        onClick={() => handleSettle(item)}
                                        disabled={isSettlingThis || settlingItem !== null}
                                    >
                                        {isSettlingThis ? 'Settling...' : 'Settle'}
                                    </button>
                                )}
                                {isSettled && (
                                    <div className="settled-badge">
                                        ✓ Settled
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default SettlementList;
