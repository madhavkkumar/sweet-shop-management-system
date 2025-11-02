import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import { sweetsAPI } from '../services/api';
import SweetCard from './SweetCard';
import SearchBar from './SearchBar';

const Dashboard = ({ user }) => {
  const [sweets, setSweets] = useState([]);
  const [filteredSweets, setFilteredSweets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchParams, setSearchParams] = useState({
    name: '',
    category: '',
    minPrice: '',
    maxPrice: ''
  });

  useEffect(() => {
    loadSweets();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [sweets, searchParams]);

  const loadSweets = async () => {
    try {
      setLoading(true);
      const data = await sweetsAPI.getAll();
      setSweets(data);
      setFilteredSweets(data);
    } catch (err) {
      setError(err.message || 'Failed to load sweets');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...sweets];

    if (searchParams.name) {
      filtered = filtered.filter(sweet =>
        sweet.name.toLowerCase().includes(searchParams.name.toLowerCase())
      );
    }

    if (searchParams.category) {
      filtered = filtered.filter(sweet =>
        sweet.category.toLowerCase().includes(searchParams.category.toLowerCase())
      );
    }

    if (searchParams.minPrice) {
      filtered = filtered.filter(sweet => sweet.price >= parseFloat(searchParams.minPrice));
    }

    if (searchParams.maxPrice) {
      filtered = filtered.filter(sweet => sweet.price <= parseFloat(searchParams.maxPrice));
    }

    setFilteredSweets(filtered);
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchParams.name) params.name = searchParams.name;
      if (searchParams.category) params.category = searchParams.category;
      if (searchParams.minPrice) params.minPrice = searchParams.minPrice;
      if (searchParams.maxPrice) params.maxPrice = searchParams.maxPrice;

      const data = await sweetsAPI.search(params);
      setFilteredSweets(data);
    } catch (err) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (sweetId, quantity) => {
    try {
      await sweetsAPI.purchase(sweetId, quantity);
      await loadSweets(); // Reload to get updated quantities
      alert(`Successfully purchased ${quantity} item(s)!`);
    } catch (err) {
      alert(err.message || 'Purchase failed');
    }
  };

  if (loading && sweets.length === 0) {
    return <div className="loading">Loading sweets...</div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Welcome, {user.username}!</h1>
        <p>Browse and purchase your favorite sweets</p>
        {sweets.length > 0 && (
          <p className="sweets-count">{sweets.length} sweet{sweets.length !== 1 ? 's' : ''} available</p>
        )}
      </div>

      <SearchBar
        searchParams={searchParams}
        setSearchParams={setSearchParams}
        onSearch={handleSearch}
      />

      {error && <div className="error-message">{error}</div>}

      <div className="sweets-grid">
        {loading && sweets.length === 0 ? (
          <div className="no-sweets">
            <p>Loading sweets...</p>
          </div>
        ) : filteredSweets.length === 0 ? (
          <div className="no-sweets">
            <p>No sweets found. Try adjusting your search filters.</p>
            <button onClick={() => {
              setSearchParams({ name: '', category: '', minPrice: '', maxPrice: '' });
            }} className="btn-clear-filters">
              Clear All Filters
            </button>
          </div>
        ) : (
          <>
            {filteredSweets.length !== sweets.length && (
              <div className="filter-results-info">
                Showing {filteredSweets.length} of {sweets.length} sweets
              </div>
            )}
            {filteredSweets.map(sweet => (
              <SweetCard
                key={sweet.id}
                sweet={sweet}
                onPurchase={handlePurchase}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

