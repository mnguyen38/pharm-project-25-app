import React, { useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import './xlsxToStore.css';

const XlsxToStore = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false); // State for modal visibility
  const [currentPage, setCurrentPage] = useState(1); // Pagination state
  const [itemsPerPage] = useState(10); // Number of items per page

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

      setParsedData(drugs); // Save parsed data to state
      setShowModal(true); // Open the modal
    };
    reader.readAsArrayBuffer(file);
  };

  const handleEdit = (index: number, field: string, value: any) => {
    const updatedData = [...parsedData];
    updatedData[index][field] = value;
    setParsedData(updatedData);
  };

  const uploadChunk = async (chunk: any[], chunkIndex: number, totalChunks: number) => {
    try {
      await axios.post('http://localhost:4000/drugCatalog', chunk, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log(`Chunk ${chunkIndex + 1}/${totalChunks} uploaded successfully`);
      setProgress(((chunkIndex + 1) / totalChunks) * 100);
    } catch (error) {
      console.error(`Error uploading chunk ${chunkIndex + 1}:`, error);
      throw error;
    }
  };

  const handleUpload = async () => {
    if (parsedData.length === 0) {
      alert('No data to upload');
      return;
    }

    setUploading(true);
    setProgress(0);

    const chunkSize = 50;
    const totalChunks = Math.ceil(parsedData.length / chunkSize);

    try {
      for (let i = 0; i < totalChunks; i++) {
        const chunk = parsedData.slice(i * chunkSize, (i + 1) * chunkSize);
        await uploadChunk(chunk, i, totalChunks);
      }
      alert('Data upload completed successfully!');
    } catch (error) {
      alert('Data upload failed. Please check the console for details.');
    } finally {
      setUploading(false);
    }
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = parsedData.slice(indexOfFirstItem, indexOfLastItem);

  const paginateNext = () => {
    if (currentPage < Math.ceil(parsedData.length / itemsPerPage)) {
      setCurrentPage(currentPage + 1);
    }
  };

  const paginatePrev = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className="upload-container">
      {/* File Upload Section */}
      <input
        type="file"
        accept=".xlsx, .xls"
        onChange={handleFileChange}
        disabled={uploading}
      />
      <button onClick={parseFile} disabled={uploading || !file}>
        Parse File
      </button>

      {/* Modal for Table */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Parsed Data</h3>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Ingredients</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((drug, index) => (
                  <tr key={indexOfFirstItem + index}>
                    <td>
                      <input
                        type="text"
                        value={drug.name}
                        onChange={(e) =>
                          handleEdit(indexOfFirstItem + index, 'name', e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <textarea
                        value={drug.ingredients}
                        onChange={(e) =>
                          handleEdit(indexOfFirstItem + index, 'ingredients', e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <button onClick={() => alert('Row saved!')}>Save</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination with Arrows */}
            <div className="pagination-arrows">
              <button onClick={paginatePrev} disabled={currentPage === 1}>
                Previous
              </button>
              <span>
                Page {currentPage} of {Math.ceil(parsedData.length / itemsPerPage)}
              </span>
              <button
                onClick={paginateNext}
                disabled={currentPage === Math.ceil(parsedData.length / itemsPerPage)}
              >
                Next
              </button>
            </div>

            {/* Progress Bar */}
            {uploading && (
              <div className="progress-container">
                <progress value={progress} max="100" />
                <span>{Math.round(progress)}%</span>
              </div>
            )}

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={uploading || parsedData.length === 0}
              className="upload-button"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>

            {/* Close Modal Button */}
            <button className="close-modal" onClick={() => setShowModal(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default XlsxToStore;