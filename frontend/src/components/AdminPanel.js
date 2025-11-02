import React, { useState, useEffect } from 'react';
import './AdminPanel.css';
import { sweetsAPI } from '../services/api';
import SweetForm from './SweetForm';
import SweetList from './SweetList';

const AdminPanel = ({ user }) => {
  const [sweets, setSweets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingSweet, setEditingSweet] = useState(null);

  useEffect(() => {
    loadSweets();
  }, []);

  const loadSweets = async () => {
    try {
      setLoading(true);
      const data = await sweetsAPI.getAll();
      setSweets(data);
    } catch (err) {
      setError(err.message || 'Failed to load sweets');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (sweetData) => {
    try {
      await sweetsAPI.create(sweetData);
      await loadSweets();
      setShowForm(false);
      alert('Sweet created successfully!');
    } catch (err) {
      alert(err.message || 'Failed to create sweet');
      throw err;
    }
  };

  const handleUpdate = async (id, sweetData) => {
    try {
      await sweetsAPI.update(id, sweetData);
      await loadSweets();
      setEditingSweet(null);
      alert('Sweet updated successfully!');
    } catch (err) {
      alert(err.message || 'Failed to update sweet');
      throw err;
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this sweet?')) {
      return;
    }

    try {
      await sweetsAPI.delete(id);
      await loadSweets();
      alert('Sweet deleted successfully!');
    } catch (err) {
      alert(err.message || 'Failed to delete sweet');
    }
  };

  const handleRestock = async (id, quantity) => {
    try {
      await sweetsAPI.restock(id, quantity);
      await loadSweets();
      alert('Sweet restocked successfully!');
    } catch (err) {
      alert(err.message || 'Failed to restock sweet');
    }
  };

  const handleSell = async (id, quantity) => {
    try {
      await sweetsAPI.purchase(id, quantity);
      await loadSweets();
      alert(`Successfully sold ${quantity} item(s)! Quantity updated.`);
    } catch (err) {
      alert(err.message || 'Failed to sell sweet');
    }
  };

  const handleEdit = (sweet) => {
    setEditingSweet(sweet);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingSweet(null);
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>Admin Panel</h1>
        <p>Welcome, {user.username}! Manage your sweets inventory.</p>
        <div className="admin-stats">
          <span>Total Sweets: {sweets.length}</span>
          <span>Low Stock: {sweets.filter(s => s.quantity > 0 && s.quantity < 10).length}</span>
          <span>Out of Stock: {sweets.filter(s => s.quantity === 0).length}</span>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            Add New Sweet
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <SweetForm
          sweet={editingSweet}
          onSubmit={editingSweet ? 
            (data) => handleUpdate(editingSweet.id, data) : 
            handleCreate
          }
          onCancel={handleCancel}
        />
      )}

      {loading ? (
        <div className="loading">Loading sweets...</div>
      ) : (
        <SweetList
          sweets={sweets}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRestock={handleRestock}
          onSell={handleSell}
        />
      )}
    </div>
  );
};

export default AdminPanel;

