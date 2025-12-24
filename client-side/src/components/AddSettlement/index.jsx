import React, { useState, useEffect } from 'react';
import { createSettlement, getSimplifiedBalances } from '../../services/api.js';
import './index.css';

const AddSettlement = ({ groupId, members, currentUserId, onSettlementAdded, onClose }) => {
    const [formData, setFormData] = useState({
        paidBy: '',
        paidTo: '',
        amount: '',
        notes: '',
        settlementDate: new Date().toISOString().split('T')[0]
    });
    const [simplifiedBalances, setSimplifiedBalances] = useState([]);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingBalances, setLoadingBalances] = useState(true);

    useEffect(() => {
        loadSimplifiedBalances();
    }, [groupId]);

    const loadSimplifiedBalances = async () => {
        try {
            setLoadingBalances(true);
            const response = await getSimplifiedBalances(groupId);
            setSimplifiedBalances(response.simplified || []);
        } catch (err) {
            console.error('Error loading balances:', err);
        } finally {
            setLoadingBalances(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError(null);
    };

    const handleBalanceClick = (from, to, amount) => {
        const fromMember = members.find(m => m.user_id === from);
        const toMember = members.find(m => m.user_id === to);
        
        if (from === currentUserId) {
            setFormData(prev => ({
                ...prev,
                paidBy: from,
                paidTo: to,
                amount: amount.toFixed(2)
            }));
        } else {
            setError('You can only settle debts that you owe');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!formData.paidBy || !formData.paidTo) {
            setError('Please select who paid and who received');
            return;
        }
        if (formData.paidBy === formData.paidTo) {
            setError('Cannot settle with yourself');
            return;
        }
        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            setError('Amount must be greater than 0');
            return;
        }

        setIsLoading(true);
        try {
            await createSettlement({
                groupId,
                paidBy: formData.paidBy,
                paidTo: formData.paidTo,
                amount: parseFloat(formData.amount),
                settlementDate: formData.settlementDate,
                notes: formData.notes || null
            });
            
            if (onSettlementAdded) {
                onSettlementAdded();
            }
            if (onClose) {
                onClose();
            }
        } catch (err) {
            setError(err.message || 'Failed to create settlement');
        } finally {
            setIsLoading(false);
        }
    };

    const getMemberName = (userId) => {
        const member = members.find(m => m.user_id === userId);
        return member ? (member.name || member.email) : userId;
    };

    const formatCurrency = (amount) => {
        return `₹${parseFloat(amount).toFixed(2)}`;
    };

    const getCurrentUserBalances = () => {
        return simplifiedBalances.filter(b => b.from === currentUserId);
    };

    return (
        <div className="add-settlement-modal">
            <div className="add-settlement-content">
                <div className="add-settlement-header">
                    <h2>Add Settlement</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit} className="add-settlement-form">
                    {loadingBalances ? (
                        <div className="loading-balances">Loading balances...</div>
                    ) : (
                        <>
                            {getCurrentUserBalances().length > 0 && (
                                <div className="form-group">
                                    <label>Quick Settle (Click to fill form)</label>
                                    <div className="balances-list">
                                        {getCurrentUserBalances().map((balance, index) => (
                                            <div
                                                key={index}
                                                className={`balance-item-clickable ${balance.from === currentUserId ? 'clickable' : ''}`}
                                                onClick={() => balance.from === currentUserId && handleBalanceClick(balance.from, balance.to, balance.amount)}
                                            >
                                                <div className="balance-info">
                                                    <span className="balance-text">
                                                        You owe <strong>{getMemberName(balance.to)}</strong>
                                                    </span>
                                                    <span className="balance-amount">{formatCurrency(balance.amount)}</span>
                                                </div>
                                                {balance.from === currentUserId && (
                                                    <span className="click-hint">Click to fill</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="form-group">
                                <label>Paid By *</label>
                                <select
                                    name="paidBy"
                                    value={formData.paidBy}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">Select who paid</option>
                                    {members.map(member => (
                                        <option key={member.user_id} value={member.user_id}>
                                            {member.name || member.email}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Paid To *</label>
                                <select
                                    name="paidTo"
                                    value={formData.paidTo}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">Select who received</option>
                                    {members
                                        .filter(m => m.user_id !== formData.paidBy)
                                        .map(member => (
                                            <option key={member.user_id} value={member.user_id}>
                                                {member.name || member.email}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Amount (₹) *</label>
                                <input
                                    type="number"
                                    name="amount"
                                    value={formData.amount}
                                    onChange={handleChange}
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0.01"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Settlement Date</label>
                                <input
                                    type="date"
                                    name="settlementDate"
                                    value={formData.settlementDate}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-group">
                                <label>Notes (Optional)</label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    placeholder="Add any notes about this settlement"
                                    rows="3"
                                />
                            </div>
                        </>
                    )}

                    {error && <div className="error-message">{error}</div>}

                    <div className="form-actions">
                        <button type="button" onClick={onClose} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={isLoading || loadingBalances}>
                            {isLoading ? 'Settling...' : 'Add Settlement'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddSettlement;

