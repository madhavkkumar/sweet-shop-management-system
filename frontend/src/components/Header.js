import React from 'react';
import './Header.css';

const Header = ({ user, onLogout }) => {
  return (
    <header className="app-header">
      <div className="header-content">
        <h1>Sweet Shop Management</h1>
        <div className="header-user">
          <span className="user-info">
            {user.username} ({user.role})
          </span>
          <button onClick={onLogout} className="btn-logout">
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;

