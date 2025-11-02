import React from 'react';
import './SearchBar.css';

const SearchBar = ({ searchParams, setSearchParams, onSearch }) => {
  const handleChange = (e) => {
    setSearchParams({
      ...searchParams,
      [e.target.name]: e.target.value
    });
  };

  const handleClear = () => {
    setSearchParams({
      name: '',
      category: '',
      minPrice: '',
      maxPrice: ''
    });
  };

  const hasActiveFilters = searchParams.name || searchParams.category || searchParams.minPrice || searchParams.maxPrice;

  return (
    <div className="search-bar">
      <h3>Search & Filter Sweets</h3>
      {hasActiveFilters && (
        <p className="active-filters-info">Active filters applied - {Object.values(searchParams).filter(v => v).length} filter(s)</p>
      )}
      <div className="search-filters">
        <div className="filter-group">
          <label>Name</label>
          <input
            type="text"
            name="name"
            value={searchParams.name}
            onChange={handleChange}
            placeholder="Search by name"
          />
        </div>

        <div className="filter-group">
          <label>Category</label>
          <input
            type="text"
            name="category"
            value={searchParams.category}
            onChange={handleChange}
            placeholder="Search by category"
          />
        </div>

        <div className="filter-group">
          <label>Min Price (₹)</label>
          <input
            type="number"
            name="minPrice"
            value={searchParams.minPrice}
            onChange={handleChange}
            min="0"
            step="0.01"
            placeholder="Min price"
          />
        </div>

        <div className="filter-group">
          <label>Max Price (₹)</label>
          <input
            type="number"
            name="maxPrice"
            value={searchParams.maxPrice}
            onChange={handleChange}
            min="0"
            step="0.01"
            placeholder="Max price"
          />
        </div>

        <div className="filter-actions">
          <button onClick={onSearch} className="btn-search">
            Search
          </button>
          <button onClick={handleClear} className="btn-clear">
            Clear
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchBar;

