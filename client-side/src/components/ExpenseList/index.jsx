import React from 'react';
import './index.css';

const ExpenseList = ({ expenses, currentUserId, onDelete }) => {
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    };

    const formatCurrency = (amount) => {
        return `₹${parseFloat(amount).toFixed(2)}`;
    };

    const getMemberName = (expense, userId) => {
        if (expense.paid_by === userId) {
            return expense.paid_by_name || expense.paid_by_email || 'You';
        }
        const split = expense.splits?.find(s => s.user_id === userId);
        if (split) {
            return split.user_name || split.user_email || 'Unknown';
        }
        return 'Unknown';
    };

    if (!expenses || expenses.length === 0) {
        return (
            <div className="expense-list-empty">
                <p>No expenses yet. Add your first expense!</p>
            </div>
        );
    }

    return (
        <div className="expense-list">
            {expenses.map(expense => (
                <div key={expense.id} className="expense-item">
                    <div className="expense-header">
                        <div className="expense-info">
                            <h3 className="expense-description">{expense.description || 'No description'}</h3>
                            <span className="expense-date">{formatDate(expense.expense_date)}</span>
                        </div>
                        <div className="expense-amount">
                            {formatCurrency(expense.amount)}
                        </div>
                    </div>
                    
                    <div className="expense-details">
                        <div className="expense-paid-by">
                            <span className="label">Paid by:</span>
                            <span className="value">{expense.paid_by_name || expense.paid_by_email}</span>
                        </div>
                        <div className="expense-split-type">
                            <span className="badge">{expense.split_type}</span>
                        </div>
                    </div>

                    <div className="expense-splits">
                        <div className="splits-header">Split among:</div>
                        <div className="splits-list">
                            {expense.splits?.map((split, index) => (
                                <div key={split.id || index} className="split-item">
                                    <span className="split-user">
                                        {split.user_name || split.user_email}
                                    </span>
                                    <span className="split-amount">
                                        {formatCurrency(split.amount)}
                                        {expense.split_type === 'PERCENTAGE' && split.percentage != null && (
                                            <span className="split-percentage">
                                                ({parseFloat(split.percentage).toFixed(1)}%)
                                            </span>
                                        )}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {onDelete && expense.created_by === currentUserId && (
                        <button 
                            className="delete-expense-btn"
                            onClick={() => onDelete(expense.id)}
                        >
                            Delete
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
};

export default ExpenseList;

