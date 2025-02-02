import React from 'react';
import { Link } from 'react-router-dom';
import './navigation.css';

const Navigation = () => {
  return (
    <nav className="top-bar">
      <h1>Pharm Project</h1>
      <div className="nav-links">
        <Link to="/upload">Upload XLSX</Link>
        <Link to="/edit">Edit Database</Link>
        <Link to="/display">View Catalog</Link>
      </div>
    </nav>
  );
};

export default Navigation;