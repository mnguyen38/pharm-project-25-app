import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import './xlsxToStore.css';

const CombinedFileUploader = () => {
  const [xlsxFile, setXlsxFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [skippedDuplicates, setSkippedDuplicates] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleXlsxFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setXlsxFile(selectedFile);
      setErrorMessage(null); // Clear any previous errors
    }
  };

  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setPdfFile(selectedFile);
      setErrorMessage(null); // Clear any previous errors
    }
  };

  const parseXlsxFile = () => {
    if (!xlsxFile) {
      setErrorMessage('Please select an Excel file first');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
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
            estimatedPrice: parseFloat(String(row[7] || '0').replace(/[^\d.-]/g, '')), // Column H
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
        } catch (error) {
          console.error('Error parsing Excel file:', error);
          setErrorMessage(`Error parsing Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      };
      
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        setErrorMessage(`FileReader error: ${error}`);
      };
      
      reader.readAsArrayBuffer(xlsxFile);
    } catch (error) {
      console.error('Error reading Excel file:', error);
      setErrorMessage(`Error reading Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const parsePdfFile = async () => {
    if (!pdfFile) {
      setErrorMessage('Please select a PDF file first');
      return;
    }

    setUploading(true);
    setProgress(10);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('pdf', pdfFile);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress((prevProgress) => {
          const newProgress = prevProgress + 5;
          return newProgress >= 90 ? 90 : newProgress;
        });
      }, 500);

      // Send the file to the server
      const response = await fetch('http://localhost:4000/uploadPdf', { // TODO: Update with actual server URL
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Server responded with status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.parsedData) {
        throw new Error('No parsed data returned from server');
      }
      
      setProgress(100);

      // Navigate to /edit with parsed data
      navigate('/edit', { state: { parsedData: result.parsedData } });
    } catch (error) {
      console.error('Error parsing PDF:', error);
      setErrorMessage(`Error parsing PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="upload-container">
      <h2>Upload Pharmaceutical Data</h2>
      
      {errorMessage && (
        <div className="error-message">
          <h3>Error:</h3>
          <p>{errorMessage}</p>
        </div>
      )}
      
      <div className="file-upload-section">
        <h3>Excel File Upload</h3>
        <input
          type="file"
          accept=".xlsx, .xls"
          onChange={handleXlsxFileChange}
          disabled={uploading}
        />
        <button 
          onClick={parseXlsxFile} 
          disabled={uploading || !xlsxFile}
        >
          Parse Excel File
        </button>
      </div>

      <div className="divider">OR</div>
      
      <div className="file-upload-section">
        <h3>PDF File Upload</h3>
        <input
          type="file"
          accept=".pdf"
          onChange={handlePdfFileChange}
          disabled={uploading}
        />
        <button 
          onClick={parsePdfFile} 
          disabled={uploading || !pdfFile}
        >
          Parse PDF File
        </button>
      </div>
      
      {uploading && (
        <div className="progress-container">
          <progress value={progress} max="100" />
          <span>{Math.round(progress)}%</span>
          <p>Processing your file... This may take a minute.</p>
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
      
      <div className="info-section">
        <h3>Supported File Formats</h3>
        <ul>
          <li><strong>Excel:</strong> .xlsx, .xls (pharmaceutical data spreadsheets)</li>
          <li><strong>PDF:</strong> Pharmaceutical registration documents from Ministry of Health</li>
        </ul>
      </div>
    </div>
  );
};

export default CombinedFileUploader;