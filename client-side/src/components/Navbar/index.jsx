import './index.css'
import { Link, useNavigate } from 'react-router-dom';
import { logout, getUser, isAuthenticated } from '../../services/api';

const Navbar = () => {
    const navigate = useNavigate();
    const user = getUser();
    const authenticated = isAuthenticated();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className='navbar-container'>
            <Link to="/" className="navbar-logo-link">
                <h1 className='navbar-h1'>Split Wise</h1>
            </Link>
            {authenticated && (
                <div className="navbar-user-section">
                    <span className="navbar-user-name">{user?.name || user?.email}</span>
                    <button onClick={handleLogout} className="navbar-logout-btn">
                        Logout
                    </button>
                </div>
            )}
        </div>
    )
}

export default Navbar