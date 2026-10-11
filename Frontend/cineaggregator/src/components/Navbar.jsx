import React from 'react';
import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">CineAggregator</Link>
      <div className="navbar-links">
        <Link to="/">Movies</Link>
        <Link to="/preferences">Preferences</Link>
      </div>
    </nav>
  );
}

export default Navbar;
