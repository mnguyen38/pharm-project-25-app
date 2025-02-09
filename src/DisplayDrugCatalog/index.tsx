import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DisplayCatalog from './displayCatalog.tsx';
import EditCatalog from './editCatalog.tsx';
import UploadCatalog from './uploadCatalog.tsx';

const DisplayDrugCatalog: React.FC = () => {
  return (
    <div>
      <Routes>
        {/* Redirect the base path to "/display" */}
        <Route path="/" element={<Navigate to="/display" replace />} />
        <Route path="/display" element={<DisplayCatalog />} />
        <Route path="/edit" element={<EditCatalog />} />
        <Route path="/edit/:id" element={<EditCatalog />} />
        <Route path="/upload" element={<UploadCatalog />} />
      </Routes>
    </div>
  );
};

export default DisplayDrugCatalog;