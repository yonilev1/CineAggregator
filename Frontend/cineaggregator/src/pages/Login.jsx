import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../services/authService';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await login(username, password);
      if (data.role === 'Admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (userType) => {
    if (userType === 'admin') {
      setUsername('admin');
      setPassword('Admin123!');
    } else {
      setUsername('user');
      setPassword('User123!');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Login to CineAggregator</h2>
        <p className="auth-subtitle">Enter your credentials to access your account.</p>

        {error && <div className="auth-error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. admin or john_doe"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary btn-auth-submit">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="demo-credentials-box">
          <p><strong>Demo Accounts:</strong></p>
          <div className="demo-buttons">
            <button type="button" onClick={() => handleFillDemo('admin')} className="btn-demo">
              Fill Admin (admin / Admin123!)
            </button>
            <button type="button" onClick={() => handleFillDemo('user')} className="btn-demo">
              Fill User (user / User123!)
            </button>
          </div>
        </div>

        <p className="auth-switch">
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
