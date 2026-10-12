import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCurrentUser, logout, isAdmin } from '../services/authService';

function Navbar() {
  const [user, setUser] = useState(getCurrentUser());
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthChange = () => {
      setUser(getCurrentUser());
    };

    window.addEventListener("authChange", handleAuthChange);
    return () => window.removeEventListener("authChange", handleAuthChange);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/" className="navbar-brand">CineAggregator</Link>
        <div className="navbar-links">
          {user && isAdmin() && (
            <Link to="/admin" className="admin-nav-link">
              ⚙️ Admin Panel
            </Link>
          )}
        </div>
      </div>

      <div className="navbar-right">
        {user ? (
          <div className="user-profile">
            <span className="user-greeting">
              👤 <strong>{user.username}</strong>
            </span>
            <span className={`role-badge ${user.role.toLowerCase()}`}>
              {user.role}
            </span>
            <button onClick={handleLogout} className="btn-logout">
              Logout
            </button>
          </div>
        ) : (
          <div className="auth-buttons">
            <Link to="/login" className="btn-auth btn-login">Login</Link>
            <Link to="/register" className="btn-auth btn-register">Register</Link>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
