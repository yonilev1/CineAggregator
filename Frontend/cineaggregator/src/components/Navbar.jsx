import React from 'react';
import { Link } from 'react-router-dom';
import { getUsername, logout } from '../services/authService';

function Navbar() {
  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">CineAggregator</Link>
      <div className="navbar-links">
        <Link to="/">Movies</Link>
        <Link to="/preferences">Preferences</Link>
        <span className="navbar-user">Hello, {getUsername()}</span>
        <button onClick={handleLogout} className="btn-logout">Logout</button>
      </div>
    </nav>
  );
}

export default Navbar;
