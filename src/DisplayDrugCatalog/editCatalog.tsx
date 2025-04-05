import React, { useEffect, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import "./editCatalog.css";
import Navigation from "../Components/navigation.tsx";
import { cleanIngredients } from "../IngredientsParsing/cleanIngredients.ts";

interface Drug {
  _id?: string; // Optional _id for existing drugs
  registrationNumber: string;
  name: string;
  ingredients: string;
  cleanedIngredients?: string[]; // Array of cleaned ingredients
  manufacturingRequirements: string;
  unitOfMeasure: string;
  estimatedPrice?: number;
  manufacturer: string;
  distributor: string;
  yearOfRegistration: string;
  countryOfOrigin: string;
  usageForm: string;
  contentOfReview?: string;
  noProposalsOnPrice?: string;
  dateOfProposolsOnPrice?: string;
  additionalNotes?: string;
}

const EditCatalog = () => {
  const location = useLocation();
  const params = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const parsedDataFromState = location.state?.parsedData || [];
  const [parsedData, setParsedData] = useState<Drug[]>([]);
  const [drugToEdit, setDrugToEdit] = useState<Drug | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState(1); // Pagination state
  const [itemsPerPage] = useState(10); // Number of items per page
  const [dataInitialized, setDataInitialized] = useState(false);

  useEffect(() => {
    console.log("EditCatalog component mounted");
    console.log("parsedDataFromState:", parsedDataFromState);
    console.log("params.id:", params.id);

    // Only run this effect once on initial render or when relevant dependencies change
    if (!dataInitialized) {
      if (params.id) {
        console.log("Fetching drug by ID:", params.id);
        // Fetch the drug by ID for individual editing
        const fetchDrug = async () => {
          try {
            const baseUrl = axios.defaults.baseURL;
            console.log("API base URL:", baseUrl);

            const response = await axios.get(`/drugCatalog/${params.id}`);
            console.log("Drug data received:", response.data);
            setDrugToEdit(response.data);
            setParsedData([response.data]);
            setDataInitialized(true); // Mark data as initialized
          } catch (error) {
            console.error("Error fetching drug:", error);
            alert("Failed to load drug details.");
            navigate("/");
          }
        };
        fetchDrug();
      } else {
        // Direct navigation to /edit without params - show empty editable table
        console.log("Direct navigation to /edit without ID - preparing empty form");
        // Set an empty template for a new drug
        const emptyDrug: Drug = {
          name: "",
          ingredients: "",
          cleanedIngredients: [],
          registrationNumber: "",
          manufacturingRequirements: "",
          unitOfMeasure: "",
          manufacturer: "",
          distributor: "",
          yearOfRegistration: "",
          countryOfOrigin: "",
          usageForm: "",
        };
        setParsedData([emptyDrug]); // Start with one empty drug
        setDataInitialized(true);
      }
    }
  }, [params.id, navigate, parsedDataFromState, dataInitialized]);

  const handleEdit = (index: number, field: string, value: any) => {
    const updatedData = [...parsedData];

    // If ingredients are being modified, also update cleanedIngredients
    if (field === "ingredients") {
      updatedData[index][field] = value;
      updatedData[index].cleanedIngredients = cleanIngredients(value);
    }
    // If cleanedIngredients are being directly edited (as a comma-separated string)
    else if (field === "cleanedIngredientsString") {
      // Convert the comma-separated string to an array
      const ingredientsArray = value
        .split(",")
        .map((item: string) => item.trim())
        .filter((item: string) => item.length > 0);

      updatedData[index].cleanedIngredients = ingredientsArray;
    } else {
      updatedData[index][field] = value;
    }

    setParsedData(updatedData);
  };

  const uploadChunk = async (
    chunk: Drug[],
    chunkIndex: number,
    totalChunks: number
  ) => {
    try {
      const response = await axios.post("/drugCatalog", chunk, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      console.log(
        `Chunk ${chunkIndex + 1}/${totalChunks} uploaded successfully`,
        response.data
      );
      setProgress(((chunkIndex + 1) / totalChunks) * 100);
    } catch (error) {
      console.error(`Error uploading chunk ${chunkIndex + 1}:`, error);
      throw error;
    }
  };

  const updateDrug = async (drug: Drug) => {
    if (!drug._id) {
      alert("Drug ID is missing. Cannot save.");
      return;
    }
    try {
      const response = await axios.put(`/drugCatalog/${drug._id}`, drug);
      console.log("Drug updated successfully:", response.data);
      alert("Drug saved successfully!");
    } catch (error) {
      console.error("Error saving drug:", error);
      alert("Failed to save drug. Please try again.");
    }
  };

  const handleUpload = async () => {
    console.log("Starting upload with data:", parsedData);
    if (parsedData.length === 0) {
      alert("No data to upload");
      return;
    }
    setUploading(true);
    setProgress(0);
    const chunkSize = 50;
    const totalChunks = Math.ceil(parsedData.length / chunkSize);
    console.log(`Uploading in ${totalChunks} chunks`);
    try {
      for (let i = 0; i < totalChunks; i++) {
        const chunk = parsedData.slice(i * chunkSize, (i + 1) * chunkSize);
        console.log(
          `Uploading chunk ${i + 1}/${totalChunks}, size: ${chunk.length}`
        );
        await uploadChunk(chunk, i, totalChunks);
      }
      alert("Data upload completed successfully!");
      navigate("/"); // Redirect back to the main catalog
    } catch (error) {
      console.error("Upload error details:", error);
      alert("Data upload failed. Please check the console for details.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (index: number) => {
    const drug = parsedData[index];
    if (drug._id) {
      await updateDrug(drug);
    } else {
      alert("Drug ID is missing. Cannot save.");
    }
  };

  // Add function to add a new row
  const addNewRow = () => {
    const emptyDrug: Drug = {
      name: "",
      ingredients: "",
      cleanedIngredients: [],
      registrationNumber: "",
      manufacturingRequirements: "",
      unitOfMeasure: "",
      manufacturer: "",
      distributor: "",
      yearOfRegistration: "",
      countryOfOrigin: "",
      usageForm: "",
    };
    setParsedData([...parsedData, emptyDrug]);
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

  // Format cleaned ingredients array to string for editing
  const formatCleanedIngredients = (ingredients?: string[]) => {
    if (!ingredients || !Array.isArray(ingredients)) return "";
    return ingredients.join(", ");
  };

  // Add some debugging output to the render function
  console.log("Rendering EditCatalog. Current state:", {
    dataInitialized,
    parsedDataLength: parsedData.length,
    currentPage,
    currentItemsLength: parsedData.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    ).length,
  });

  return (
    <>
      <Navigation />
      <div className="display-container">
        <h3>{params.id ? "Edit Drug" : "Add/Edit Drugs"}</h3>
        {parsedData.length === 0 ? (
          <div className="no-data-message">
            <p>No data available. You can add a new drug entry or upload files.</p>
            <button onClick={addNewRow} className="add-row-button">
              Add New Drug
            </button>
          </div>
        ) : (
          <>
            <table className="drug-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Raw Ingredients</th>
                  <th>Cleaned Ingredients</th>
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
                          handleEdit(
                            indexOfFirstItem + index,
                            "name",
                            e.target.value
                          )
                        }
                      />
                    </td>
                    <td>
                      <textarea
                        value={drug.ingredients}
                        onChange={(e) =>
                          handleEdit(
                            indexOfFirstItem + index,
                            "ingredients",
                            e.target.value
                          )
                        }
                      />
                    </td>
                    <td>
                      <textarea
                        value={formatCleanedIngredients(drug.cleanedIngredients)}
                        onChange={(e) =>
                          handleEdit(
                            indexOfFirstItem + index,
                            "cleanedIngredientsString",
                            e.target.value
                          )
                        }
                        placeholder="Comma-separated list of cleaned ingredients"
                      />
                      <small className="text-muted">
                        Edit ingredients by separating them with commas
                      </small>
                    </td>
                    <td>
                      <button onClick={() => handleSave(indexOfFirstItem + index)}>
                        Save
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Pagination with Arrows */}
            <div className="pagination">
              <button onClick={paginatePrev} disabled={currentPage === 1}>
                Previous
              </button>
              <span className="page-info">
                Page {currentPage} of {Math.ceil(parsedData.length / itemsPerPage)}
              </span>
              <button
                onClick={paginateNext}
                disabled={
                  currentPage === Math.ceil(parsedData.length / itemsPerPage)
                }
              >
                Next
              </button>
            </div>
            {/* Add New Row Button */}
            {!params.id && (
              <button onClick={addNewRow} className="add-row-button">
                Add New Row
              </button>
            )}
            {/* Progress Bar */}
            {uploading && (
              <div className="progress-container">
                <progress value={progress} max="100" />
                <span>{Math.round(progress)}%</span>
              </div>
            )}
            {/* Upload Button */}
            {!params.id && (
              <button
                onClick={handleUpload}
                disabled={uploading || parsedData.length === 0}
                className="upload-button"
              >
                {uploading ? "Uploading..." : "Upload"}
              </button>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default EditCatalog;
