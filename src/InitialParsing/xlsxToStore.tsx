import React, { useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import './xlsxToStore.css';

const XlsxToStore = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [skippedDuplicates, setSkippedDuplicates] = useState<string[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile); // Update the state with the selected file
    }
  };

  const uploadChunk = async (chunk: any[], chunkIndex: number, totalChunks: number) => {
    try {
      const response = await axios.post('http://localhost:4000/drugCatalog', chunk, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log(`Chunk ${chunkIndex + 1}/${totalChunks} uploaded successfully:`, response.data);

      // Update progress
      setProgress(((chunkIndex + 1) / totalChunks) * 100);
    } catch (error) {
      console.error(`Error uploading chunk ${chunkIndex + 1}:`, error);
      // throw error; // Re-throw the error to stop further processing
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a file first');
      return;
    }

    setUploading(true);
    setProgress(0);

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
        drug['registrationNumber'] = row[4]; // Column E
        drug['manufacturingRequirements'] = row[5]; // Column F
        drug['unitOfMeasure'] = row[6]; // Column G
        drug['estimatedPrice'] = parseFloat(
          String(row[7]).replace(/[^\d.-]/g, '') // Column H
        );
        drug['manufacturer'] = row[8]; // Column I
        drug['distributor'] = row[9]; // Column J
        drug['yearOfRegistration'] = row[10]; // Column K
        drug['countryOfOrigin'] = row[11]; // Column L
        drug['usageForm'] = row[12]; // Column M
        drug['contentOfReview'] = row[13]; // Column N
        drug['noProposalsOnPrice'] = row[14]; // Column O
        drug['dateOfProposolsOnPrice'] = row[15]; // Column P
        drug['additionalNotes'] = row[16]; // Column Q

        return drug;
      });

      console.log('Parsed drugs:', drugs);

      const uniqueIds = new Set();
      const duplicatesInFile: string[] = [];
      const uniqueDrugs = drugs.filter(drug => {
        if (uniqueIds.has(drug._id)) {
          duplicatesInFile.push(drug._id); // Track duplicates
          return false; // Skip this drug
        }
        uniqueIds.add(drug._id);
        return true; // Include this drug
      });

      if (duplicatesInFile.length > 0) {
        console.warn('Duplicate _id values found in the uploaded file:', duplicatesInFile);
        setSkippedDuplicates(duplicatesInFile);
      }


      // Split data into chunks
      const chunkSize = 50;
      const totalChunks = Math.ceil(drugs.length / chunkSize);

      // Upload each chunk sequentially
      const uploadChunks = async () => {
        for (let i = 0; i < totalChunks; i++) {
          const chunk = drugs.slice(i * chunkSize, (i + 1) * chunkSize);
          await uploadChunk(chunk, i, totalChunks);
        }
        setUploading(false);
        alert('Data upload completed successfully!');
      };

      uploadChunks().catch(() => {
        setUploading(false);
        alert('Data upload failed. Please check the console for details.');
      });
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="upload-container">
      <input type="file" accept=".xlsx, .xls" onChange={handleFileChange} disabled={uploading} />
      <button onClick={handleUpload} disabled={uploading || !file}>
        {uploading ? 'Uploading...' : 'Upload'}
      </button>
      {uploading && (
        <div className='progress-container'>
          <progress value={progress} max="100" />
          <span>{Math.round(progress)}%</span>
        </div>
      )}
      {skippedDuplicates.length > 0 && (
        <div className='skipped-duplicates'>  {/*i just have this here for now it doesnt do anything but in case its needed down the line for sth*/}
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