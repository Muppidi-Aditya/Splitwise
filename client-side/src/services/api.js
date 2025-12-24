const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';


const getToken = () => {
    return localStorage.getItem('authToken');
};

export const setToken = (token) => {
    localStorage.setItem('authToken', token);
};

export const removeToken = () => {
    localStorage.removeItem('authToken');
};

export const getUser = () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
};

export const setUser = (user) => {
    localStorage.setItem('user', JSON.stringify(user));
};

export const removeUser = () => {
    localStorage.removeItem('user');
};

const apiRequest = async (endpoint, options = {}) => {
    const token = getToken();
    
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
        },
        ...options,
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'An error occurred');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export const sendOTP = async (email, type = 'login', name = null) => {
    return apiRequest('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ email, type, ...(name && { name }) }),
    });
};

export const verifyOTP = async (email, otp) => {
    return apiRequest('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email, otp }),
    });
};

export const register = async (email, otp, name) => {
    return apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, otp, name }),
    });
};

export const logout = () => {
    removeToken();
    removeUser();
};

export const isAuthenticated = () => {
    return !!getToken();
};


export const createGroup = async (name) => {
    return apiRequest('/groups', {
        method: 'POST',
        body: JSON.stringify({ name }),
    });
};

export const getUserGroups = async () => {
    return apiRequest('/groups', {
        method: 'GET',
    });
};

export const getGroupMembers = async (groupId) => {
    return apiRequest(`/groups/${groupId}/members`, {
        method: 'GET',
    });
};

export const inviteUserToGroup = async (groupId, email) => {
    return apiRequest(`/groups/${groupId}/invite`, {
        method: 'POST',
        body: JSON.stringify({ email }),
    });
};

export const getPendingInvites = async () => {
    return apiRequest('/groups/invites', {
        method: 'GET',
    });
};

export const respondToInvite = async (inviteId, response) => {
    return apiRequest(`/groups/invites/${inviteId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ response }),
    });
};

export const getGroupInvites = async (groupId) => {
    return apiRequest(`/groups/${groupId}/invites`, {
        method: 'GET',
    });
};

export const leaveGroup = async (groupId) => {
    return apiRequest(`/groups/${groupId}/leave`, {
        method: 'POST',
    });
};

export const removeMember = async (groupId, userId) => {
    return apiRequest(`/groups/${groupId}/remove-member`, {
        method: 'POST',
        body: JSON.stringify({ userId }),
    });
};

export const updateGroupName = async (groupId, name) => {
    return apiRequest(`/groups/${groupId}`, {
        method: 'PUT',
        body: JSON.stringify({ name }),
    });
};


export const createExpense = async (expenseData) => {
    return apiRequest('/expenses', {
        method: 'POST',
        body: JSON.stringify(expenseData),
    });
};

export const getGroupExpenses = async (groupId, limit = 50, offset = 0) => {
    return apiRequest(`/expenses/group/${groupId}?limit=${limit}&offset=${offset}`, {
        method: 'GET',
    });
};

export const getExpenseById = async (expenseId) => {
    return apiRequest(`/expenses/${expenseId}`, {
        method: 'GET',
    });
};

export const updateExpense = async (expenseId, updates) => {
    return apiRequest(`/expenses/${expenseId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    });
};

export const deleteExpense = async (expenseId) => {
    return apiRequest(`/expenses/${expenseId}`, {
        method: 'DELETE',
    });
};


export const createSettlement = async (settlementData) => {
    return apiRequest('/settlements', {
        method: 'POST',
        body: JSON.stringify(settlementData),
    });
};

export const getGroupSettlements = async (groupId, limit = 50, offset = 0) => {
    return apiRequest(`/settlements/group/${groupId}?limit=${limit}&offset=${offset}`, {
        method: 'GET',
    });
};

export const getSettlementById = async (settlementId) => {
    return apiRequest(`/settlements/${settlementId}`, {
        method: 'GET',
    });
};

export const deleteSettlement = async (settlementId) => {
    return apiRequest(`/settlements/${settlementId}`, {
        method: 'DELETE',
    });
};


export const getUserGroupBalance = async (groupId, userId) => {
    return apiRequest(`/balances/group/${groupId}/user/${userId}`, {
        method: 'GET',
    });
};

export const getGroupBalances = async (groupId) => {
    return apiRequest(`/balances/group/${groupId}`, {
        method: 'GET',
    });
};

export const getSimplifiedBalances = async (groupId) => {
    return apiRequest(`/balances/group/${groupId}/simplified`, {
        method: 'GET',
    });
};

