import React, { useState } from 'react';
import './SweetList.css';

const SweetList = ({ sweets, onEdit, onDelete, onRestock, onSell }) => {
  const [restockData, setRestockData] = useState({});
  const [sellData, setSellData] = useState({});

  const handleRestock = (id) => {
    const quantity = parseInt(restockData[id] || 0);
    if (quantity > 0) {
      onRestock(id, quantity);
      setRestockData({ ...restockData, [id]: '' });
    } else {
      alert('Please enter a valid quantity');
    }
  };

  const handleSell = (id, sweet) => {
    const quantity = parseInt(sellData[id] || 0);
    if (quantity <= 0) {
      alert('Please enter a valid quantity to sell');
      return;
    }
    if (quantity > sweet.quantity) {
      alert(`Cannot sell ${quantity} items. Only ${sweet.quantity} available in stock.`);
      return;
    }
    onSell(id, quantity);
    setSellData({ ...sellData, [id]: '' });
  };

  if (sweets.length === 0) {
    return (
      <div className="no-sweets">
        <p>No sweets found. Add your first sweet!</p>
      </div>
    );
  }

  return (
    <div className="sweet-list">
      <h2>All Sweets ({sweets.length})</h2>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Category</th>
              <th>Price (₹)</th>
              <th>Quantity</th>
              <th>Restock</th>
              <th>Sell</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sweets.map(sweet => (
              <tr key={sweet.id}>
                <td>{sweet.id}</td>
                <td><strong>{sweet.name}</strong></td>
                <td><span className="category-tag">{sweet.category}</span></td>
                <td>₹{sweet.price.toFixed(2)}</td>
                <td className={sweet.quantity === 0 ? 'stock-zero' : ''}>
                  {sweet.quantity}
                </td>
                <td>
                  <div className="restock-controls">
                    <input
                      type="number"
                      min="1"
                      value={restockData[sweet.id] || ''}
                      onChange={(e) => setRestockData({ ...restockData, [sweet.id]: e.target.value })}
                      placeholder="Qty"
                      className="restock-input"
                    />
                    <button
                      onClick={() => handleRestock(sweet.id)}
                      className="btn-restock"
                    >
                      Add
                    </button>
                  </div>
                </td>
                <td>
                  <div className="sell-controls">
                    <input
                      type="number"
                      min="1"
                      max={sweet.quantity}
                      value={sellData[sweet.id] || ''}
                      onChange={(e) => setSellData({ ...sellData, [sweet.id]: e.target.value })}
                      placeholder="Qty"
                      className="sell-input"
                      disabled={sweet.quantity === 0}
                    />
                    <button
                      onClick={() => handleSell(sweet.id, sweet)}
                      className="btn-sell"
                      disabled={sweet.quantity === 0}
                    >
                      Sell
                    </button>
                  </div>
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      onClick={() => onEdit(sweet)}
                      className="btn-edit"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(sweet.id)}
                      className="btn-delete"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SweetList;

