import React, { useState, useEffect } from 'react';
import { getSimplifiedBalances, getGroupBalances } from '../../services/api.js';
import './index.css';

const BalanceSummary = ({ groupId, members, currentUserId }) => {
    const [simplified, setSimplified] = useState([]);
    const [allBalances, setAllBalances] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState('simplified');

    useEffect(() => {
        loadBalances();
    }, [groupId]);

    const loadBalances = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [simplifiedRes, balancesRes] = await Promise.all([
                getSimplifiedBalances(groupId),
                getGroupBalances(groupId)
            ]);
            setSimplified(simplifiedRes.simplified || []);
            setAllBalances(balancesRes.balances || []);
        } catch (err) {
            setError(err.message || 'Failed to load balances');
        } finally {
            setIsLoading(false);
        }
    };

    const getMemberName = (userId) => {
        const member = members.find(m => m.user_id === userId);
        return member ? (member.name || member.email) : userId;
    };

    const formatCurrency = (amount) => {
        return `₹${Math.abs(parseFloat(amount)).toFixed(2)}`;
    };

    if (isLoading) {
        return (
            <div className="balance-summary">
                <div className="loading">Loading balances...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="balance-summary">
                <div className="error-message">{error}</div>
            </div>
        );
    }

    const hasBalances = simplified.length > 0 || allBalances.some(b => b.balance !== 0);

    if (!hasBalances) {
        return (
            <div className="balance-summary">
                <div className="balance-summary-header">
                    <h3>Balances</h3>
                </div>
                <div className="no-balances">
                    <p>Everyone is settled up! 🎉</p>
                </div>
            </div>
        );
    }

    return (
        <div className="balance-summary">
            <div className="balance-summary-header">
                <h3>Balances</h3>
                <div className="view-toggle">
                    <button
                        className={viewMode === 'simplified' ? 'active' : ''}
                        onClick={() => setViewMode('simplified')}
                    >
                        Simplified
                    </button>
                    <button
                        className={viewMode === 'detailed' ? 'active' : ''}
                        onClick={() => setViewMode('detailed')}
                    >
                        Detailed
                    </button>
                </div>
            </div>

            {viewMode === 'simplified' ? (
                <div className="simplified-balances">
                    <p className="section-description">
                        Net balance for each member:
                    </p>
                    {allBalances.length === 0 || allBalances.every(b => Math.abs(b.balance) < 0.01) ? (
                        <div className="no-balances">
                            <p>Everyone is settled up! 🎉</p>
                        </div>
                    ) : (
                        <div className="balance-list">
                            {allBalances.map((balance) => {
                                if (Math.abs(balance.balance) < 0.01) return null;
                                
                                return (
                                    <div key={balance.userId} className="balance-item simplified">
                                        <span className="balance-user">
                                            {getMemberName(balance.userId)}
                                        </span>
                                        <span className={`balance-amount ${balance.balance > 0 ? 'positive' : 'negative'}`}>
                                            {balance.balance > 0 ? '+' : ''}{formatCurrency(balance.balance)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : (
                <div className="detailed-balances">
                    <p className="section-description">
                        Your balances (who you owe in red, who owes you in green):
                    </p>
                    {(() => {
                        const currentUserBalance = allBalances.find(b => b.userId === currentUserId);
                        if (!currentUserBalance || Math.abs(currentUserBalance.balance) < 0.01) {
                            return (
                                <div className="no-balances">
                                    <p>You are all settled up! 🎉</p>
                                </div>
                            );
                        }

                        const userOwes = simplified.filter(b => b.from === currentUserId);
                        const owesUser = simplified.filter(b => b.to === currentUserId);

                        return (
                            <div className="balance-list">
                                {userOwes.map((balance, index) => (
                                    <div key={`owe-${index}`} className="balance-item detailed negative-item">
                                        <span className="balance-text">
                                            You owe <strong>{getMemberName(balance.to)}</strong>
                                        </span>
                                        <span className="balance-amount negative">
                                            {formatCurrency(balance.amount)}
                                        </span>
                                    </div>
                                ))}
                                {owesUser.map((balance, index) => (
                                    <div key={`owed-${index}`} className="balance-item detailed positive-item">
                                        <span className="balance-text">
                                            <strong>{getMemberName(balance.from)}</strong> owes you
                                        </span>
                                        <span className="balance-amount positive">
                                            {formatCurrency(balance.amount)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        );
                    })()}
                </div>
            )}
        </div>
    );
};

export default BalanceSummary;

