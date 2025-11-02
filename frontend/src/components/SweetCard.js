import React, { useState } from 'react';
import './SweetCard.css';

const SweetCard = ({ sweet, onPurchase }) => {
  const [quantity, setQuantity] = useState(1);
  const [purchasing, setPurchasing] = useState(false);

  const handlePurchase = async () => {
    if (quantity <= 0 || quantity > sweet.quantity) {
      alert('Invalid quantity');
      return;
    }

    setPurchasing(true);
    try {
      await onPurchase(sweet.id, quantity);
      setQuantity(1);
    } catch (err) {
      alert(err.message);
    } finally {
      setPurchasing(false);
    }
  };

  const isOutOfStock = sweet.quantity === 0;
  const isLowStock = sweet.quantity > 0 && sweet.quantity < 5;

  return (
    <div className={`sweet-card ${isOutOfStock ? 'out-of-stock' : ''} ${isLowStock ? 'low-stock' : ''}`}>
      <div className="sweet-header">
        <h3>{sweet.name}</h3>
        <span className="category-badge">{sweet.category}</span>
      </div>
      
      <div className="sweet-details">
        <div className="price">₹{sweet.price.toFixed(2)}</div>
        <div className={`stock ${isOutOfStock ? 'stock-zero' : isLowStock ? 'stock-low' : ''}`}>
          {isOutOfStock ? 'Out of Stock' : isLowStock ? `Low Stock: ${sweet.quantity}` : `In Stock: ${sweet.quantity}`}
        </div>
      </div>

      {!isOutOfStock && (
        <div className="purchase-section">
          <div className="quantity-selector">
            <label>Quantity:</label>
            <input
              type="number"
              min="1"
              max={sweet.quantity}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(parseInt(e.target.value) || 1, sweet.quantity)))}
            />
          </div>
          <button
            onClick={handlePurchase}
            disabled={purchasing || quantity <= 0 || quantity > sweet.quantity}
            className="purchase-btn"
          >
            {purchasing ? 'Purchasing...' : `Purchase (₹${(sweet.price * quantity).toFixed(2)})`}
          </button>
        </div>
      )}

      {isOutOfStock && (
        <div className="out-of-stock-section">
          <button disabled className="purchase-btn disabled">
            Out of Stock
          </button>
        </div>
      )}
    </div>
  );
};

export default SweetCard;

