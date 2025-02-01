import React from 'react';
import './App.css';
import XlsxToStore from './InitialParsing/xlsxToStore.tsx';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Drug Catalog Uploader</h1>
        {XlsxToStore()}
      </header>
    </div>
  );
}

export default App;