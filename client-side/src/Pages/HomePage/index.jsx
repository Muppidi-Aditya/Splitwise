import { Component } from "react";
import { useNavigate } from 'react-router-dom';
import Navbar from "../../components/Navbar";
import { getUserGroups, createGroup, getPendingInvites, respondToInvite, getGroupBalances } from "../../services/api";
import './index.css';

class Home extends Component {
    constructor(props) {
        super(props);
        this.state = {
            groups: [],
            invites: [],
            isLoading: true,
            showCreateModal: false,
            showInvitesModal: false,
            newGroupName: '',
            error: null,
            success: null
        };
    }

    componentDidMount() {
        this.loadData();
    }

    loadData = async () => {
        try {
            this.setState({ isLoading: true, error: null });
            const [groupsRes, invitesRes] = await Promise.all([
                getUserGroups(),
                getPendingInvites()
            ]);
            
            const groups = groupsRes.groups || [];
            const currentUser = JSON.parse(localStorage.getItem('user'));
            
            const groupsWithBalances = await Promise.all(
                groups.map(async (group) => {
                    try {
                        const balancesRes = await getGroupBalances(group.id);
                        const userBalance = balancesRes.balances?.find(b => b.userId === currentUser?.id);
                        return {
                            ...group,
                            userBalance: userBalance?.balance || 0
                        };
                    } catch (error) {
                        console.error(`Error fetching balance for group ${group.id}:`, error);
                        return {
                            ...group,
                            userBalance: 0
                        };
                    }
                })
            );
            
            this.setState({
                groups: groupsWithBalances,
                invites: invitesRes.invites || [],
                isLoading: false
            });
        } catch (error) {
            this.setState({
                error: error.message || 'Failed to load data',
                isLoading: false
            });
        }
    }

    handleCreateGroup = async (e) => {
        e.preventDefault();
        if (!this.state.newGroupName.trim()) {
            this.setState({ error: 'Group name is required' });
            return;
        }

        try {
            this.setState({ error: null, isLoading: true });
            await createGroup(this.state.newGroupName.trim());
            this.setState({
                showCreateModal: false,
                newGroupName: '',
                success: 'Group created successfully!'
            });
            this.loadData();
            setTimeout(() => this.setState({ success: null }), 3000);
        } catch (error) {
            this.setState({ error: error.message || 'Failed to create group' });
        } finally {
            this.setState({ isLoading: false });
        }
    }

    handleRespondToInvite = async (inviteId, response) => {
        try {
            this.setState({ error: null, isLoading: true });
            await respondToInvite(inviteId, response);
            this.setState({
                success: `Invitation ${response.toLowerCase()} successfully!`
            });
            this.loadData();
            setTimeout(() => this.setState({ success: null }), 3000);
        } catch (error) {
            this.setState({ error: error.message || 'Failed to respond to invitation' });
        } finally {
            this.setState({ isLoading: false });
        }
    }

    render() {
        const { groups, invites, isLoading, showCreateModal, showInvitesModal, newGroupName, error, success } = this.state;

        return (
            <div className="home-page-wrapper">
                <Navbar />
                <div className="home-page-container">
                    <div className="home-header">
                        <h1>My Groups</h1>
                        <div className="home-actions">
                            {invites.length > 0 && (
                                <button 
                                    className="btn-invites"
                                    onClick={() => this.setState({ showInvitesModal: true })}
                                >
                                    Invites ({invites.length})
                                </button>
                            )}
                            <button 
                                className="btn-create"
                                onClick={() => this.setState({ showCreateModal: true })}
                            >
                                + Create Group
                            </button>
                        </div>
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
                            <p>Loading groups...</p>
                        </div>
                    ) : groups.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">👥</div>
                            <h2>No groups yet</h2>
                            <p>Create your first group to start splitting expenses!</p>
                            <button 
                                className="btn-create"
                                onClick={() => this.setState({ showCreateModal: true })}
                            >
                                Create Group
                            </button>
                        </div>
                    ) : (
                        <div className="groups-grid">
                            {groups.map(group => {
                                const balance = group.userBalance || 0;
                                let balanceClass = 'balance-zero';
                                if (balance > 0.01) {
                                    balanceClass = 'balance-positive';
                                } else if (balance < -0.01) {
                                    balanceClass = 'balance-negative';
                                }
                                
                                return (
                                <div 
                                    key={group.id} 
                                    className={`group-card ${balanceClass}`}
                                    onClick={() => this.props.navigate(`/groups/${group.id}`, { 
                                        state: { groupName: group.name } 
                                    })}
                                >
                                    <div className="group-card-header">
                                        <h3>{group.name}</h3>
                                        {group.role === 'admin' && (
                                            <span className="role-badge admin">Admin</span>
                                        )}
                                    </div>
                                    <div className="group-card-meta">
                                        <span className="group-role">Role: {group.role}</span>
                                        <span className="group-date">
                                            Joined: {new Date(group.joined_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="group-card-footer">
                                        <span className="view-details">View Details →</span>
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {
}
                {showCreateModal && (
                    <div className="modal-overlay" onClick={() => this.setState({ showCreateModal: false, newGroupName: '', error: null })}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <h2>Create New Group</h2>
                            <form onSubmit={this.handleCreateGroup}>
                                <div className="form-group">
                                    <label>Group Name</label>
                                    <input
                                        type="text"
                                        value={newGroupName}
                                        onChange={(e) => this.setState({ newGroupName: e.target.value, error: null })}
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
                                        onClick={() => this.setState({ showCreateModal: false, newGroupName: '', error: null })}
                                        disabled={isLoading}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="btn-submit"
                                        disabled={isLoading || !newGroupName.trim()}
                                    >
                                        {isLoading ? 'Creating...' : 'Create'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {
}
                {showInvitesModal && (
                    <div className="modal-overlay" onClick={() => this.setState({ showInvitesModal: false })}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <h2>Pending Invitations</h2>
                            {invites.length === 0 ? (
                                <p className="no-invites">No pending invitations</p>
                            ) : (
                                <div className="invites-list">
                                    {invites.map(invite => (
                                        <div key={invite.id} className="invite-item">
                                            <div className="invite-info">
                                                <h4>{invite.group_name}</h4>
                                                <p>Invited by {invite.inviter_name || invite.inviter_email}</p>
                                            </div>
                                            <div className="invite-actions">
                                                <button
                                                    className="btn-accept"
                                                    onClick={() => this.handleRespondToInvite(invite.id, 'ACCEPTED')}
                                                    disabled={isLoading}
                                                >
                                                    Accept
                                                </button>
                                                <button
                                                    className="btn-reject"
                                                    onClick={() => this.handleRespondToInvite(invite.id, 'REJECTED')}
                                                    disabled={isLoading}
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <button 
                                className="btn-close-modal"
                                onClick={() => this.setState({ showInvitesModal: false })}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )
    }
}

const HomeWithNavigate = (props) => {
    const navigate = useNavigate();
    return <Home {...props} navigate={navigate} />;
};

export default HomeWithNavigate;
