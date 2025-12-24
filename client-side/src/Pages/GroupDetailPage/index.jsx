import { Component } from "react";
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Navbar from "../../components/Navbar";
import BalanceSummary from "../../components/BalanceSummary";
import ExpenseList from "../../components/ExpenseList";
import AddExpense from "../../components/AddExpense";
import SettlementList from "../../components/SettlementList";
import { 
    getGroupMembers, 
    inviteUserToGroup, 
    leaveGroup, 
    removeMember, 
    updateGroupName,
    getGroupInvites,
    getGroupExpenses,
    deleteExpense,
    getSimplifiedBalances,
    getGroupSettlements
} from "../../services/api";
import './index.css';

class GroupDetail extends Component {
    constructor(props) {
        super(props);
        this.state = {
            members: [],
            invites: [],
            expenses: [],
            simplifiedBalances: [],
            settlements: [],
            isLoading: true,
            isAdmin: false,
            groupName: '',
            showInviteModal: false,
            showEditModal: false,
            showRemoveModal: false,
            showAddExpenseModal: false,
            inviteEmail: '',
            editGroupName: '',
            removeUserId: null,
            error: null,
            success: null
        };
    }

    componentDidMount() {
        this.loadGroupData();
    }

    loadGroupData = async () => {
        try {
            this.setState({ isLoading: true, error: null });
            const groupId = this.props.params.groupId;
            
            const [membersRes, invitesRes, expensesRes, balancesRes, settlementsRes] = await Promise.all([
                getGroupMembers(groupId),
                getGroupInvites(groupId).catch(() => ({ invites: [] })),
                getGroupExpenses(groupId).catch(() => ({ expenses: [] })),
                getSimplifiedBalances(groupId).catch(() => ({ simplified: [] })),
                getGroupSettlements(groupId).catch(() => ({ settlements: [] }))
            ]);

            const members = membersRes.members || [];
            const currentUser = JSON.parse(localStorage.getItem('user'));
            const currentMember = members.find(m => m.user_id === currentUser?.id);
            
            const groupName = this.props.location?.state?.groupName || 'Group';
            
            this.setState({
                members,
                invites: invitesRes.invites || [],
                expenses: expensesRes.expenses || [],
                simplifiedBalances: balancesRes.simplified || [],
                settlements: settlementsRes.settlements || [],
                isAdmin: currentMember?.role === 'admin',
                groupName,
                isLoading: false
            });
        } catch (error) {
            this.setState({
                error: error.message || 'Failed to load group data',
                isLoading: false
            });
        }
    }

    handleExpenseAdded = () => {
        this.loadGroupData();
        this.setState({ showAddExpenseModal: false, success: 'Expense added successfully!' });
        setTimeout(() => this.setState({ success: null }), 3000);
    }

    handleDeleteExpense = async (expenseId) => {
        if (!window.confirm('Are you sure you want to delete this expense?')) {
            return;
        }

        try {
            this.setState({ error: null, isLoading: true });
            await deleteExpense(expenseId);
            this.setState({ success: 'Expense deleted successfully!' });
            this.loadGroupData();
            setTimeout(() => this.setState({ success: null }), 3000);
        } catch (error) {
            this.setState({ error: error.message || 'Failed to delete expense' });
        } finally {
            this.setState({ isLoading: false });
        }
    }

    handleSettlementAdded = () => {
        this.loadGroupData();
        this.setState({ success: 'Settlement added successfully!' });
        setTimeout(() => this.setState({ success: null }), 3000);
    }

    handleInviteUser = async (e) => {
        e.preventDefault();
        if (!this.state.inviteEmail.trim()) {
            this.setState({ error: 'Email is required' });
            return;
        }

        try {
            this.setState({ error: null, isLoading: true });
            await inviteUserToGroup(this.props.params.groupId, this.state.inviteEmail.trim());
            this.setState({
                showInviteModal: false,
                inviteEmail: '',
                success: 'Invitation sent successfully!'
            });
            this.loadGroupData();
            setTimeout(() => this.setState({ success: null }), 3000);
        } catch (error) {
            this.setState({ error: error.message || 'Failed to send invitation' });
        } finally {
            this.setState({ isLoading: false });
        }
    }

    handleLeaveGroup = async () => {
        if (!window.confirm('Are you sure you want to leave this group?')) {
            return;
        }

        try {
            this.setState({ error: null, isLoading: true });
            await leaveGroup(this.props.params.groupId);
            this.setState({ success: 'Left group successfully!' });
            setTimeout(() => {
                this.props.navigate('/');
            }, 1500);
        } catch (error) {
            this.setState({ 
                error: error.message || 'Failed to leave group',
                isLoading: false
            });
        }
    }

    handleRemoveMember = async () => {
        if (!this.state.removeUserId) return;

        try {
            this.setState({ error: null, isLoading: true });
            await removeMember(this.props.params.groupId, this.state.removeUserId);
            this.setState({
                showRemoveModal: false,
                removeUserId: null,
                success: 'Member removed successfully!'
            });
            this.loadGroupData();
            setTimeout(() => this.setState({ success: null }), 3000);
        } catch (error) {
            this.setState({ error: error.message || 'Failed to remove member' });
        } finally {
            this.setState({ isLoading: false });
        }
    }

    handleUpdateGroupName = async (e) => {
        e.preventDefault();
        if (!this.state.editGroupName.trim()) {
            this.setState({ error: 'Group name is required' });
            return;
        }

        try {
            this.setState({ error: null, isLoading: true });
            const response = await updateGroupName(this.props.params.groupId, this.state.editGroupName.trim());
            this.setState({
                showEditModal: false,
                groupName: response.group.name,
                editGroupName: '',
                success: 'Group name updated successfully!'
            });
            setTimeout(() => this.setState({ success: null }), 3000);
        } catch (error) {
            this.setState({ error: error.message || 'Failed to update group name' });
        } finally {
            this.setState({ isLoading: false });
        }
    }

    render() {
        const { 
            members, invites, expenses, simplifiedBalances, settlements, isLoading, isAdmin, groupName, 
            showInviteModal, showEditModal, showRemoveModal, showAddExpenseModal,
            inviteEmail, editGroupName, removeUserId, error, success
        } = this.state;
        const currentUser = JSON.parse(localStorage.getItem('user'));

        return (
            <div className="group-detail-wrapper">
                <Navbar />
                <div className="group-detail-container">
                    <div className="group-detail-header">
                        <div>
                            <button 
                                className="btn-back"
                                onClick={() => this.props.navigate('/')}
                            >
                                ← Back
                            </button>
                            <h1>{groupName}</h1>
                        </div>
                        {isAdmin && (
                            <div className="header-actions">
                                <button 
                                    className="btn-edit"
                                    onClick={() => this.setState({ showEditModal: true, editGroupName: groupName })}
                                >
                                    Edit Name
                                </button>
                                <button 
                                    className="btn-invite"
                                    onClick={() => this.setState({ showInviteModal: true, inviteEmail: '', error: null })}
                                >
                                    + Invite User
                                </button>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="alert alert-error">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="alert alert-success">
                            {success}
                        </div>
                    )}

                    {isLoading ? (
                        <div className="loading-container">
                            <div className="loading-spinner"></div>
                            <p>Loading group details...</p>
                        </div>
                    ) : (
                        <>
                            <BalanceSummary 
                                groupId={this.props.params.groupId}
                                members={members}
                                currentUserId={JSON.parse(localStorage.getItem('user'))?.id}
                            />

                            <div className="section">
                                <div className="section-header">
                                    <h2>Expenses</h2>
                                    <button 
                                        className="btn-add-expense"
                                        onClick={() => this.setState({ showAddExpenseModal: true })}
                                    >
                                        + Add Expense
                                    </button>
                                </div>
                                <ExpenseList 
                                    expenses={expenses}
                                    currentUserId={JSON.parse(localStorage.getItem('user'))?.id}
                                    onDelete={this.handleDeleteExpense}
                                />
                            </div>

                            <div className="section">
                                <div className="section-header">
                                    <h2>Settlements</h2>
                                </div>
                                <SettlementList 
                                    groupId={this.props.params.groupId}
                                    simplifiedBalances={simplifiedBalances || []}
                                    settlements={settlements || []}
                                    members={members}
                                    currentUserId={JSON.parse(localStorage.getItem('user'))?.id}
                                    onSettlementAdded={this.handleSettlementAdded}
                                />
                            </div>

                            <div className="section">
                                <h2>Members ({members.length})</h2>
                                <div className="members-list">
                                    {members.map(member => (
                                        <div key={member.id} className="member-card">
                                            <div className="member-info">
                                                <div className="member-avatar">
                                                    {(member.name || member.email || 'U')[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <h4>{member.name || member.email}</h4>
                                                    <p>{member.email}</p>
                                                </div>
                                            </div>
                                            <div className="member-actions">
                                                {member.role === 'admin' && (
                                                    <span className="role-badge admin">Admin</span>
                                                )}
                                                {isAdmin && member.user_id !== currentUser?.id && (
                                                    <button
                                                        className="btn-remove"
                                                        onClick={() => this.setState({ 
                                                            showRemoveModal: true, 
                                                            removeUserId: member.user_id 
                                                        })}
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {isAdmin && invites.length > 0 && (
                                <div className="section">
                                    <h2>Pending Invitations ({invites.filter(i => i.status === 'PENDING').length})</h2>
                                    <div className="invites-list">
                                        {invites.filter(i => i.status === 'PENDING').map(invite => (
                                            <div key={invite.id} className="invite-card">
                                                <div>
                                                    <h4>{invite.invited_user_name || invite.invited_user_email}</h4>
                                                    <p>Status: {invite.status}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {!isAdmin && (
                                <div className="section">
                                    <button 
                                        className="btn-leave"
                                        onClick={this.handleLeaveGroup}
                                        disabled={isLoading}
                                    >
                                        Leave Group
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {
}
                {showInviteModal && (
                    <div className="modal-overlay" onClick={() => this.setState({ showInviteModal: false, inviteEmail: '', error: null })}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <h2>Invite User to Group</h2>
                            <form onSubmit={this.handleInviteUser}>
                                <div className="form-group">
                                    <label>Email Address</label>
                                    <input
                                        type="email"
                                        value={inviteEmail}
                                        onChange={(e) => this.setState({ inviteEmail: e.target.value, error: null })}
                                        placeholder="Enter user's email"
                                        autoFocus
                                        disabled={isLoading}
                                    />
                                </div>
                                {error && <div className="form-error">{error}</div>}
                                <div className="modal-actions">
                                    <button 
                                        type="button" 
                                        className="btn-cancel"
                                        onClick={() => this.setState({ showInviteModal: false, inviteEmail: '', error: null })}
                                        disabled={isLoading}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="btn-submit"
                                        disabled={isLoading || !inviteEmail.trim()}
                                    >
                                        {isLoading ? 'Sending...' : 'Send Invite'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {
}
                {showEditModal && (
                    <div className="modal-overlay" onClick={() => this.setState({ showEditModal: false, editGroupName: '', error: null })}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <h2>Edit Group Name</h2>
                            <form onSubmit={this.handleUpdateGroupName}>
                                <div className="form-group">
                                    <label>Group Name</label>
                                    <input
                                        type="text"
                                        value={editGroupName}
                                        onChange={(e) => this.setState({ editGroupName: e.target.value, error: null })}
                                        placeholder="Enter group name"
                                        autoFocus
                                        disabled={isLoading}
                                    />
                                </div>
                                {error && <div className="form-error">{error}</div>}
                                <div className="modal-actions">
                                    <button 
                                        type="button" 
                                        className="btn-cancel"
                                        onClick={() => this.setState({ showEditModal: false, editGroupName: '', error: null })}
                                        disabled={isLoading}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="btn-submit"
                                        disabled={isLoading || !editGroupName.trim()}
                                    >
                                        {isLoading ? 'Updating...' : 'Update'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {
}
                {showRemoveModal && removeUserId && (
                    <div className="modal-overlay" onClick={() => this.setState({ showRemoveModal: false, removeUserId: null })}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <h2>Remove Member</h2>
                            <p>Are you sure you want to remove this member from the group? They must have a balance of ₹0.</p>
                            {error && <div className="form-error">{error}</div>}
                            <div className="modal-actions">
                                <button 
                                    type="button" 
                                    className="btn-cancel"
                                    onClick={() => this.setState({ showRemoveModal: false, removeUserId: null, error: null })}
                                    disabled={isLoading}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="button" 
                                    className="btn-submit"
                                    onClick={this.handleRemoveMember}
                                    disabled={isLoading || !removeUserId}
                                >
                                    {isLoading ? 'Removing...' : 'Remove'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {
}
                {showAddExpenseModal && (
                    <AddExpense
                        groupId={this.props.params.groupId}
                        members={members}
                        onExpenseAdded={this.handleExpenseAdded}
                        onClose={() => this.setState({ showAddExpenseModal: false })}
                    />
                )}

            </div>
        )
    }
}

const GroupDetailWithHooks = (props) => {
    const params = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    return <GroupDetail {...props} params={params} navigate={navigate} location={location} />;
};

export default GroupDetailWithHooks;

