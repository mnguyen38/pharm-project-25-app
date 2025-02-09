import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import './xlsxToStore.css';

const XlsxToStore = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [skippedDuplicates, setSkippedDuplicates] = useState<string[]>([]);
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const parseFile = () => {
    if (!file) {
      alert('Please select a file first');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Data starts from row 4, so skip the first 3 rows
      const rows = json.slice(3);
      const drugs = (rows as any[][]).map((row: any[]) => ({
        name: row[1], // Column B
        ingredients: row[2], // Column C
        registrationNumber: row[4], // Column E
        manufacturingRequirements: row[5], // Column F
        unitOfMeasure: row[6], // Column G
        estimatedPrice: parseFloat(String(row[7]).replace(/[^\d.-]/g, '')), // Column H
        manufacturer: row[8], // Column I
        distributor: row[9], // Column J
        yearOfRegistration: row[10], // Column K
        countryOfOrigin: row[11], // Column L
        usageForm: row[12], // Column M
        contentOfReview: row[13], // Column N
        noProposalsOnPrice: row[14], // Column O
        dateOfProposolsOnPrice: row[15], // Column P
        additionalNotes: row[16], // Column Q
      }));

      // Redirect to /edit with parsed data
      navigate('/edit', { state: { parsedData: drugs } });
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="upload-container">
      {/* File Upload Section */}
      <input
        type="file"
        accept=".xlsx, .xls"
        onChange={handleFileChange}
      />
      <button onClick={parseFile} disabled={uploading || !file}>
        Parse File
      </button>
      {uploading && (
        <div className="progress-container">
          <progress value={progress} max="100" />
          <span>{Math.round(progress)}%</span>
        </div>
      )}
      {skippedDuplicates.length > 0 && (
        <div className="skipped-duplicates">
          <h3>Skipped Duplicates:</h3>
          <ul>
            {skippedDuplicates.map((id, index) => (
              <li key={index}>{id}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default XlsxToStore;