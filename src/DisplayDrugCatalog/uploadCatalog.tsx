import React from 'react';
import Navigation from '../Components/navigation.tsx';
import XlsxToStore from '../InitialParsing/xlsxToStore.tsx';

const UploadCatalog = () => {
  return (
    <div>
      <Navigation />
      <XlsxToStore />
    </div>
  );
};

export default UploadCatalog;