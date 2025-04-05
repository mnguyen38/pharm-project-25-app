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

  useEffect(() => {
    if (params.id) {
      // Fetch the drug by ID for individual editing
      const fetchDrug = async () => {
        try {
          const response = await axios.get(`/drugCatalog/${params.id}`);
          setDrugToEdit(response.data);
          setParsedData([response.data]);
        } catch (error) {
          console.error("Error fetching drug:", error);
          alert("Failed to load drug details.");
          navigate("/");
        }
      };
      fetchDrug();
    } else {
      // Use parsed data for bulk editing and ensure cleanedIngredients are populated
      const dataWithCleanedIngredients = parsedDataFromState.map(
        (drug: Drug) => {
          // If cleanedIngredients are missing, generate them
          if (!drug.cleanedIngredients && drug.ingredients) {
            return {
              ...drug,
              cleanedIngredients: cleanIngredients(drug.ingredients),
            };
          }
          return drug;
        }
      );
      setParsedData(dataWithCleanedIngredients);
    }
  }, [params.id, navigate, parsedDataFromState]);

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
      const response = await axios.post(
        "http://localhost:4000/drugCatalog",
        chunk,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
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
      const response = await axios.put(
        `http://localhost:4000/drugCatalog/${drug._id}`,
        drug
      );
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

  return (
    <>
      <Navigation />
      <div className="display-container">
        <h3>{params.id ? "Edit Drug" : "Edit Data"}</h3>
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
      </div>
    </>
  );
};

export default EditCatalog;
