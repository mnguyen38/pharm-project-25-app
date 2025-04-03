import React from 'react';
import Navigation from '../Components/navigation.tsx';
import XlsxToStore from '../InitialParsing/xlsxToStore.tsx';
import CombinedFileUploader from '../InitialParsing/combinedFileUploader.tsx';

const UploadCatalog = () => {
  return (
    <div>
      <Navigation />
      <CombinedFileUploader />
    </div>
  );
};

export default UploadCatalog;