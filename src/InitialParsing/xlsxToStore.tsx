import React, { useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

const XlsxToStore = () => {
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile); // Update the state with the selected file
    }
  };

  const parseDate = (dateString: string | undefined): Date | undefined => {
    if (!dateString) return undefined;
  
    // Split the date string into day, month, and year
    const [day, month, year] = dateString.split('/').map(Number);
  
    // Validate the parsed values
    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      console.warn('Invalid date format:', dateString);
      return undefined;
    }
  
    // Create a Date object with the time set to midnight
    return new Date(year, month - 1, day);
  };

  const handleUpload = async () => {
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

      const drugs = (rows as any[][]).map((row: any[]) => {
        const drug: any = {};

        // Map columns based on their positions
        drug['name'] = row[1]; // Column B
        drug['ingredients'] = row[2]; // Column C
        drug['_id'] = row[4]; // Column E
        drug['manufacturingRequirements'] = row[5]; // Column F
        drug['unitOfMeasure'] = row[6]; // Column G
        drug['estimatedPrice'] = parseFloat(
          String(row[7]).replace(/[^\d.-]/g, '') // Column H
        );
        drug['manufacturer'] = row[8]; // Column I
        drug['distributor'] = row[9]; // Column J
        drug['yearOfRegistration'] = parseDate(row[10]); // Column K
        drug['countryOfOrigin'] = row[11]; // Column L
        drug['usageForm'] = row[12]; // Column M
        drug['contentOfReview'] = row[13]; // Column N
        drug['noProposalsOnPrice'] = row[14]; // Column O
        drug['dateOfProposolsOnPrice'] = parseDate(row[15]); // Column P
        drug['additionalNotes'] = row[16]; // Column Q

        return drug;
      });

      // Send data to backend
      axios.post('http://localhost:4000/drugCatalog', drugs, {
        headers: {
          'Content-Type': 'application/json',
        },
      })
      .then(response => {
        console.log('Data uploaded successfully:', response.data);
        alert('Data uploaded successfully');
      })
      .catch(error => {
        console.error('Error uploading data:', error);
        alert('Error uploading data');
      });
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <div>
      <h1>Upload Drug Catalog</h1>
      <input type="file" accept=".xlsx, .xls" onChange={handleFileChange} />
      <button onClick={handleUpload}>Upload</button>
    </div>
  );
};

export default XlsxToStore;