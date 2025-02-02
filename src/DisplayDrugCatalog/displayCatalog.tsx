import React from 'react';
import Navigation from '../Components/navigation.tsx';

const DisplayCatalog = () => {
  return (
    <div>
      <Navigation /> 
      <div className="display-container">
        <h3>Drug Catalog</h3>
      </div>
    </div>
  );
};

export default DisplayCatalog;