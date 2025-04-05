import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
import "./xlsxToStore.css";
import { cleanIngredients } from "../IngredientsParsing/cleanIngredients.ts";

const CombinedFileUploader = () => {
  const [xlsxFile, setXlsxFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [skippedDuplicates, setSkippedDuplicates] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(
    null
  );
  const navigate = useNavigate();

  // Clear the polling interval when component unmounts
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Start polling when jobId is set
  useEffect(() => {
    if (jobId) {
      startPolling(jobId);
    }
  }, [jobId]);

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

  // Function to start polling for status updates
  const startPolling = (id: string) => {
    console.log(`Starting to poll for status updates for job: ${id}`);

    // Clear any existing polling
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    // Set up a new polling interval
    const interval = setInterval(async () => {
      try {
        const statusResponse = await fetch(
          `http://localhost:4000/pdfStatus/${id}`
        );

        if (!statusResponse.ok) {
          const errorData = await statusResponse
            .json()
            .catch(() => ({ error: "Unknown error" }));
          throw new Error(
            errorData.error ||
              `Status check failed with status: ${statusResponse.status}`
          );
        }

        const statusData = await statusResponse.json();
        console.log("Status update:", statusData);

        // Update UI with current progress
        setProgress(statusData.progress || 0);

        // Show detailed message if available
        if (statusData.message) {
          console.log(`Processing status: ${statusData.message}`);
          setStatusMessage(statusData.message);
        }

        // Check if processing is complete or failed
        if (statusData.status === "completed") {
          console.log("Processing completed successfully");
          clearInterval(interval);
          setPollingInterval(null);

          // Navigate to edit with the parsed data
          navigate("/edit", { state: { parsedData: statusData.result } });
        } else if (statusData.status === "failed") {
          clearInterval(interval);
          setPollingInterval(null);
          throw new Error(
            `PDF processing failed: ${statusData.message || "Unknown error"}`
          );
        }
      } catch (error) {
        console.error("Error polling for status:", error);
        setErrorMessage(
          `Error checking processing status: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
        clearInterval(interval);
        setPollingInterval(null);
        setUploading(false);
      }
    }, 5000); // Poll every 5 seconds

    setPollingInterval(interval);
  };

  const parseXlsxFile = () => {
    if (!xlsxFile) {
      setErrorMessage("Please select an Excel file first");
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          // Data starts from row 4, so skip the first 3 rows
          const rows = json.slice(3);
          const drugs = (rows as any[][]).map((row: any[]) => {
            // Extract ingredients for cleaning
            const ingredientsRaw = row[2] || ""; // Column C
            const cleanedIngredientsList = cleanIngredients(ingredientsRaw);

            return {
              name: row[1], // Column B
              ingredients: ingredientsRaw,
              cleanedIngredients: cleanedIngredientsList, // Add cleaned ingredients
              registrationNumber: row[4], // Column E
              manufacturingRequirements: row[5], // Column F
              unitOfMeasure: row[6], // Column G
              estimatedPrice: parseFloat(
                String(row[7] || "0").replace(/[^\d.-]/g, "")
              ), // Column H
              manufacturer: row[8], // Column I
              distributor: row[9], // Column J
              yearOfRegistration: row[10], // Column K
              countryOfOrigin: row[11], // Column L
              usageForm: row[12], // Column M
              contentOfReview: row[13], // Column N
              noProposalsOnPrice: row[14], // Column O
              dateOfProposolsOnPrice: row[15], // Column P
              additionalNotes: row[16], // Column Q
            };
          });

          // Redirect to /edit with parsed data
          navigate("/edit", { state: { parsedData: drugs } });
        } catch (error) {
          console.error("Error parsing Excel file:", error);
          setErrorMessage(
            `Error parsing Excel file: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      };

      reader.onerror = (error) => {
        console.error("FileReader error:", error);
        setErrorMessage(`FileReader error: ${error}`);
      };

      reader.readAsArrayBuffer(xlsxFile);
    } catch (error) {
      console.error("Error reading Excel file:", error);
      setErrorMessage(
        `Error reading Excel file: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const parsePdfFile = async () => {
    if (!pdfFile) {
      setErrorMessage("Please select a PDF file first");
      return;
    }

    setUploading(true);
    setProgress(5);
    setErrorMessage(null);
    setJobId(null); // Reset job ID
    setStatusMessage("Uploading PDF file...");

    const formData = new FormData();
    formData.append("pdf", pdfFile);

    try {
      console.log("Sending PDF upload request...");
      const uploadResponse = await fetch("http://localhost:4000/uploadPdf", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse
          .json()
          .catch(() => ({ error: "Unknown error" }));
        throw new Error(
          errorData.error ||
            `Server responded with status: ${uploadResponse.status}`
        );
      }

      // Parse the JSON response
      const responseData = await uploadResponse.json();
      console.log("Server response:", responseData);

      // Check if we received immediate data instead of job ID
      if (responseData.result) {
        console.log("Immediate data received, redirecting to edit page");
        setUploading(false);
        navigate("/edit", { state: { parsedData: responseData.result } });
        return;
      }

      // If we have a jobId, start polling
      if (responseData.jobId) {
        setJobId(responseData.jobId);
        setStatusMessage(
          `Processing started with job ID: ${responseData.jobId}`
        );
        console.log(
          `Received job ID: ${responseData.jobId}, polling will start automatically`
        );
        return;
      }

      // If we don't have either result or jobId, something went wrong
      throw new Error("No job ID or result data returned from server");
    } catch (error) {
      console.error("Error parsing PDF:", error);
      setErrorMessage(
        `Error parsing PDF: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setUploading(false);
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
        <button onClick={parseXlsxFile} disabled={uploading || !xlsxFile}>
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
        <button onClick={parsePdfFile} disabled={uploading || !pdfFile}>
          Parse PDF File
        </button>
      </div>

      {uploading && (
        <div className="progress-container">
          <div className="progress-bar-container">
            <div
              className="progress-bar"
              style={{ width: `${Math.round(progress)}%` }}
            ></div>
          </div>
          <div className="progress-info">
            <span className="progress-percentage">{Math.round(progress)}%</span>
            <p className="progress-message">
              {statusMessage || "Processing..."}
            </p>
            {jobId && <p className="job-id">Job ID: {jobId}</p>}
          </div>
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
          <li>
            <strong>Excel:</strong> .xlsx, .xls (pharmaceutical data
            spreadsheets)
          </li>
          <li>
            <strong>PDF:</strong> Pharmaceutical registration documents from
            Ministry of Health
          </li>
        </ul>
        <p>
          <strong>Note:</strong> Both raw and cleaned ingredients will be
          processed. Cleaned ingredients can be edited after parsing.
        </p>
      </div>
    </div>
  );
};

export default CombinedFileUploader;
