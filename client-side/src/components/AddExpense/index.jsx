import React, { useState, useEffect } from 'react';
import { createExpense } from '../../services/api.js';
import './index.css';

const AddExpense = ({ groupId, members, onExpenseAdded, onClose }) => {
    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        paidBy: '',
        splitType: 'EQUAL',
        expenseDate: new Date().toISOString().split('T')[0],
        splits: []
    });
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (members.length > 0 && formData.splitType === 'EQUAL') {
            const equalSplits = members.map(member => ({
                userId: member.user_id,
                amount: 0
            }));
            setFormData(prev => ({ ...prev, splits: equalSplits }));
        }
    }, [members, formData.splitType]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError(null);
    };

    const handleSplitTypeChange = (e) => {
        const newSplitType = e.target.value;
        setFormData(prev => {
            if (newSplitType === 'EQUAL') {
                return {
                    ...prev,
                    splitType: newSplitType,
                    splits: members.map(m => ({ userId: m.user_id, amount: 0 }))
                };
            } else if (newSplitType === 'EXACT') {
                return {
                    ...prev,
                    splitType: newSplitType,
                    splits: members.map(m => ({ userId: m.user_id, amount: 0 }))
                };
            } else if (newSplitType === 'PERCENTAGE') {
                return {
                    ...prev,
                    splitType: newSplitType,
                    splits: members.map(m => ({ userId: m.user_id, amount: 0, percentage: 0 }))
                };
            }
            return prev;
        });
    };

    const handleParticipantToggle = (userId) => {
        setFormData(prev => {
            const existingIndex = prev.splits.findIndex(s => s.userId === userId);
            if (existingIndex >= 0) {
                return {
                    ...prev,
                    splits: prev.splits.filter(s => s.userId !== userId)
                };
            } else {
                const newSplit = formData.splitType === 'PERCENTAGE'
                    ? { userId, amount: 0, percentage: 0 }
                    : { userId, amount: 0 };
                return {
                    ...prev,
                    splits: [...prev.splits, newSplit]
                };
            }
        });
    };

    const handleSplitChange = (userId, field, value) => {
        setFormData(prev => {
            const newSplits = prev.splits.map(split => {
                if (split.userId === userId) {
                    const updated = { ...split, [field]: parseFloat(value) || 0 };
                    
                    if (field === 'percentage' && prev.splitType === 'PERCENTAGE' && prev.amount) {
                        updated.amount = (prev.amount * parseFloat(value)) / 100;
                    }
                    if (field === 'amount' && prev.splitType === 'PERCENTAGE' && prev.amount) {
                        updated.percentage = (parseFloat(value) / prev.amount) * 100;
                    }
                    
                    return updated;
                }
                return split;
            });
            return { ...prev, splits: newSplits };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!formData.description.trim()) {
            setError('Description is required');
            return;
        }
        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            setError('Amount must be greater than 0');
            return;
        }
        if (!formData.paidBy) {
            setError('Please select who paid');
            return;
        }
        if (formData.splits.length === 0) {
            setError('At least one participant is required');
            return;
        }

        let finalSplits = formData.splits;
        if (formData.splitType === 'EQUAL') {
            const amountPerPerson = parseFloat(formData.amount) / formData.splits.length;
            finalSplits = formData.splits.map((split, index) => {
                let amount = amountPerPerson;
                if (index === 0) {
                    const remainder = parseFloat(formData.amount) - (amountPerPerson * formData.splits.length);
                    amount += remainder;
                }
                return {
                    ...split,
                    amount: parseFloat(amount.toFixed(2))
                };
            });
        }

        if (formData.splitType === 'EXACT') {
            const total = finalSplits.reduce((sum, s) => sum + (s.amount || 0), 0);
            const difference = Math.abs(parseFloat(formData.amount) - total);
            if (difference > 0.01) {
                setError(`Sum of amounts (${total.toFixed(2)}) must equal expense amount (${formData.amount})`);
                return;
            }
        }
        if (formData.splitType === 'PERCENTAGE') {
            const totalPercentage = finalSplits.reduce((sum, s) => sum + (s.percentage || 0), 0);
            if (Math.abs(totalPercentage - 100) > 0.01) {
                setError(`Sum of percentages (${totalPercentage.toFixed(2)}%) must equal 100%`);
                return;
            }
        }

        setIsLoading(true);
        try {
            await createExpense({
                groupId,
                paidBy: formData.paidBy,
                amount: parseFloat(formData.amount),
                description: formData.description,
                splitType: formData.splitType,
                splits: finalSplits,
                expenseDate: formData.expenseDate
            });
            
            if (onExpenseAdded) {
                onExpenseAdded();
            }
            if (onClose) {
                onClose();
            }
        } catch (err) {
            setError(err.message || 'Failed to create expense');
        } finally {
            setIsLoading(false);
        }
    };

    const getMemberName = (userId) => {
        const member = members.find(m => m.user_id === userId);
        return member ? (member.name || member.email) : userId;
    };

    const isParticipantSelected = (userId) => {
        return formData.splits.some(s => s.userId === userId);
    };

    const getParticipantSplit = (userId) => {
        return formData.splits.find(s => s.userId === userId);
    };

    return (
        <div className="add-expense-modal">
            <div className="add-expense-content">
                <div className="add-expense-header">
                    <h2>Add Expense</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit} className="add-expense-form">
                    <div className="form-group">
                        <label>Description *</label>
                        <input
                            type="text"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="What was this expense for?"
                            required
                        />
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
                        <label>Expense Date</label>
                        <input
                            type="date"
                            name="expenseDate"
                            value={formData.expenseDate}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="form-group">
                        <label>Split Type *</label>
                        <select
                            name="splitType"
                            value={formData.splitType}
                            onChange={handleSplitTypeChange}
                            required
                        >
                            <option value="EQUAL">Equal</option>
                            <option value="EXACT">Exact Amount</option>
                            <option value="PERCENTAGE">Percentage</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Participants *</label>
                        <div className="participants-list">
                            {members.map(member => {
                                const isSelected = isParticipantSelected(member.user_id);
                                const split = getParticipantSplit(member.user_id);
                                
                                return (
                                    <div key={member.user_id} className="participant-item">
                                        <label className="participant-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleParticipantToggle(member.user_id)}
                                            />
                                            <span>{getMemberName(member.user_id)}</span>
                                        </label>
                                        
                                        {isSelected && formData.splitType === 'EXACT' && (
                                            <input
                                                type="number"
                                                className="split-input"
                                                placeholder="Amount"
                                                value={split?.amount || ''}
                                                onChange={(e) => handleSplitChange(member.user_id, 'amount', e.target.value)}
                                                step="0.01"
                                                min="0"
                                            />
                                        )}
                                        
                                        {isSelected && formData.splitType === 'PERCENTAGE' && (
                                            <div className="percentage-inputs">
                                                <input
                                                    type="number"
                                                    className="split-input"
                                                    placeholder="%"
                                                    value={split?.percentage || ''}
                                                    onChange={(e) => handleSplitChange(member.user_id, 'percentage', e.target.value)}
                                                    step="0.01"
                                                    min="0"
                                                    max="100"
                                                />
                                                <span className="amount-display">
                                                    ₹{((formData.amount || 0) * (split?.percentage || 0) / 100).toFixed(2)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <div className="form-actions">
                        <button type="button" onClick={onClose} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={isLoading}>
                            {isLoading ? 'Adding...' : 'Add Expense'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddExpense;

