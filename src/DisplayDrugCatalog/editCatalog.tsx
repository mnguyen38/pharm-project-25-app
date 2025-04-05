import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import "./editCatalog.css";
import Navigation from "../Components/navigation.tsx";
import { cleanIngredients } from "../IngredientsParsing/cleanIngredients.ts";

// Set axios default base URL
axios.defaults.baseURL = "http://localhost:4000";

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

// Interface for ingredient suggestions
interface IngredientSuggestion {
  name: string;
  distance: number;
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
  const [totalPages, setTotalPages] = useState(1);
  const [mode, setMode] = useState<"single" | "bulk" | "database">("database");
  const [isLoading, setIsLoading] = useState(false);
  // New state for canonical ingredients
  const [canonicalIngredients, setCanonicalIngredients] = useState<string[]>(
    []
  );
  // State for ingredient suggestions
  const [ingredientSuggestions, setIngredientSuggestions] = useState<{
    [key: string]: IngredientSuggestion[];
  }>({});
  // Add ref to track if we've already tried to fetch canonical ingredients
  const canonicalFetchAttempted = useRef(false);

  useEffect(() => {
    console.log("EditCatalog component mounted");
    console.log("parsedDataFromState:", parsedDataFromState);
    console.log("params.id:", params.id);

    // Only fetch canonical ingredients once
    if (!canonicalFetchAttempted.current) {
      canonicalFetchAttempted.current = true;
      fetchCanonicalIngredients();
    }

    // Only run this effect once on initial render or when relevant dependencies change
    if (!dataInitialized) {
      if (params.id) {
        console.log("Fetching drug by ID:", params.id);
        // Single drug edit mode
        setMode("single");
        // Fetch the drug by ID for individual editing
        const fetchDrug = async () => {
          try {
            setIsLoading(true);
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
          } finally {
            setIsLoading(false);
          }
        };
        fetchDrug();
      } else if (parsedDataFromState && parsedDataFromState.length > 0) {
        // Bulk edit mode - data from file uploader
        setMode("bulk");
        console.log(
          "Bulk edit mode - data from file uploader:",
          parsedDataFromState.length,
          "items"
        );

        // Process the data from file uploader
        const dataWithCleanedIngredients = parsedDataFromState.map(
          (drug: Drug) => {
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
        setTotalPages(
          Math.ceil(dataWithCleanedIngredients.length / itemsPerPage)
        );
        setDataInitialized(true);
      } else {
        // Database edit mode - load all drugs from database
        setMode("database");
        console.log("Database edit mode - loading drugs from database");
        fetchDrugsFromDatabase(1);
      }
    }
  }, [params.id, navigate, parsedDataFromState, dataInitialized, itemsPerPage]);

  // Function to fetch canonical ingredients list
  const fetchCanonicalIngredients = async () => {
    try {
      const response = await axios.get("/canonicalIngredients");
      setCanonicalIngredients(
        response.data.map((ingredient) => ingredient.name)
      );
      console.log("Fetched canonical ingredients:", response.data.length);
    } catch (error) {
      console.error("Error fetching canonical ingredients:", error);
      // Provide fallback ingredients if endpoint doesn't exist yet
      const fallbackIngredients = [];
      console.log("Using fallback ingredients due to API error");
      setCanonicalIngredients(fallbackIngredients);
    }
  };

  // Function to add new canonical ingredients to the database
  const addNewCanonicalIngredients = async (ingredients) => {
    try {
      // Get current canonical ingredients for comparison
      const response = await axios.get("/canonicalIngredients");
      const existingIngredients = new Set(
        response.data.map((ing) => ing.name.toLowerCase())
      );

      // Filter out ingredients that already exist (case insensitive)
      const newIngredients = ingredients.filter(
        (ingredient) => !existingIngredients.has(ingredient.toLowerCase())
      );

      if (newIngredients.length === 0) {
        console.log("No new ingredients to add");
        return;
      }

      // Add the new ingredients
      console.log("Adding new canonical ingredients:", newIngredients);
      await axios.post("/canonicalIngredients", newIngredients);

      // Refresh the ingredients list
      fetchCanonicalIngredients();
    } catch (error) {
      console.error("Error adding new canonical ingredients:", error);
    }
  };

  // Optimized function to calculate Levenshtein distance with early termination
  const calculateLevenshteinDistance = (
    a: string,
    b: string,
    threshold: number = Infinity
  ): number => {
    // If the length difference exceeds the threshold, we can return early
    if (Math.abs(a.length - b.length) > threshold) {
      return threshold + 1;
    }

    // Optimization: If strings are equal, no need to calculate
    if (a === b) return 0;

    // Optimization: If either string is empty, the distance is the length of the other string
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    // Use two rows of the matrix instead of the whole matrix to save memory
    let previousRow = Array(b.length + 1);
    let currentRow = Array(b.length + 1);

    // Initialize the previous row
    for (let i = 0; i <= b.length; i++) {
      previousRow[i] = i;
    }

    // Fill in the current row
    for (let i = 1; i <= a.length; i++) {
      currentRow[0] = i;

      let minDistance = threshold + 1; // Track minimum in this row for early termination

      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;

        currentRow[j] = Math.min(
          previousRow[j] + 1, // deletion
          currentRow[j - 1] + 1, // insertion
          previousRow[j - 1] + cost // substitution
        );

        // Keep track of minimum in this row
        if (currentRow[j] < minDistance) {
          minDistance = currentRow[j];
        }
      }

      // If every cell in this row exceeds threshold, can return early
      if (minDistance > threshold) {
        return threshold + 1;
      }

      // Swap rows for next iteration
      const temp = previousRow;
      previousRow = currentRow;
      currentRow = temp;
    }

    // The last calculated value is in previousRow[b.length] due to the row swap
    return previousRow[b.length];
  };

  // Function to find and suggest closest canonical ingredients (optimized)
  const findSuggestedIngredients = (
    ingredient: string,
    maxSuggestions: number = 3
  ): IngredientSuggestion[] => {
    if (!ingredient || ingredient.trim().length === 0) return [];

    const sanitizedIngredient = ingredient.trim().toLowerCase();
    if (sanitizedIngredient.length < 2) return []; // Skip very short strings

    const results: IngredientSuggestion[] = [];
    let maxDistance = 100; // Start with a high threshold

    // First pass - find initial candidates with quick checks
    const initialCandidates = canonicalIngredients.filter((canonical) => {
      // Quick check: exact match
      if (canonical.toLowerCase() === sanitizedIngredient) {
        results.push({ name: canonical, distance: 0 });
        return false;
      }

      // Quick check: first few characters match (good candidates)
      const lowerCanonical = canonical.toLowerCase();
      return (
        lowerCanonical.startsWith(sanitizedIngredient.substring(0, 2)) ||
        sanitizedIngredient.startsWith(lowerCanonical.substring(0, 2))
      );
    });

    // If we already have exact matches, just return them
    if (results.length > 0) return results;

    // Second pass - calculate distances for promising candidates
    for (const canonical of initialCandidates) {
      // Calculate distance with current maxDistance threshold
      const distance = calculateLevenshteinDistance(
        sanitizedIngredient,
        canonical.toLowerCase(),
        maxDistance
      );

      // If distance is within our threshold, add to results
      if (distance <= maxDistance) {
        results.push({ name: canonical, distance });

        // If we have enough suggestions, update the maxDistance threshold
        if (results.length >= maxSuggestions) {
          results.sort((a, b) => a.distance - b.distance);
          // Keep only the top maxSuggestions
          if (results.length > maxSuggestions) {
            results.length = maxSuggestions;
          }
          // Update threshold to the worst distance we're currently keeping
          maxDistance = results[results.length - 1].distance;
        }
      }
    }

    // If we don't have enough suggestions from the initial candidates,
    // check the remaining ingredients with our current threshold
    if (results.length < maxSuggestions) {
      const remainingIngredients = canonicalIngredients.filter(
        (canonical) => !initialCandidates.includes(canonical)
      );

      for (const canonical of remainingIngredients) {
        const distance = calculateLevenshteinDistance(
          sanitizedIngredient,
          canonical.toLowerCase(),
          maxDistance
        );

        if (distance <= maxDistance) {
          results.push({ name: canonical, distance });

          // Sort and trim results after each addition that meets our criteria
          if (results.length >= maxSuggestions) {
            results.sort((a, b) => a.distance - b.distance);
            if (results.length > maxSuggestions) {
              results.length = maxSuggestions;
            }
            maxDistance = results[results.length - 1].distance;
          }
        }
      }
    }

    return results.sort((a, b) => a.distance - b.distance);
  };

  // Function to generate suggestions for all ingredients in a drug
  const generateSuggestionsForDrug = (index: number) => {
    const drug = parsedData[index];
    if (!drug.cleanedIngredients || drug.cleanedIngredients.length === 0) {
      // If no cleaned ingredients, try to parse from raw ingredients
      handleAutoParse(index);
      return;
    }

    // Generate suggestions for each cleaned ingredient
    const suggestions: { [key: string]: IngredientSuggestion[] } = {};
    drug.cleanedIngredients.forEach((ingredient) => {
      suggestions[ingredient] = findSuggestedIngredients(ingredient);
    });

    // Update the suggestions state
    setIngredientSuggestions((prev) => ({
      ...prev,
      [index]: suggestions,
    }));
  };

  // Function to handle auto-parsing of ingredients
  const handleAutoParse = (index: number) => {
    const updatedData = [...parsedData];
    const drug = updatedData[index];

    if (drug.ingredients) {
      // Clean the ingredients and update the cleaned ingredients array
      const cleaned = cleanIngredients(drug.ingredients);
      updatedData[index].cleanedIngredients = cleaned;
      setParsedData(updatedData);

      // Generate suggestions for the newly cleaned ingredients
      setTimeout(() => generateSuggestionsForDrug(index), 0);
    }
  };

  // Function to handle clicking on a suggested ingredient
  const handleSuggestionClick = (index: number, suggestion: string) => {
    const updatedData = [...parsedData];
    const drug = updatedData[index];

    // Get current cleaned ingredients as a string
    const currentCleanedStr = formatCleanedIngredients(drug.cleanedIngredients);

    // Append the suggestion with a comma if there are already ingredients
    const newCleanedStr = currentCleanedStr
      ? `${currentCleanedStr}, ${suggestion}`
      : suggestion;

    // Update the cleaned ingredients
    handleEdit(index, "cleanedIngredientsString", newCleanedStr);
  };

  // Function to fetch drugs from database with pagination
  const fetchDrugsFromDatabase = async (page: number) => {
    try {
      setIsLoading(true);
      const response = await axios.get("/drugCatalog", {
        params: { page, limit: itemsPerPage },
      });

      // Check if the response includes total count for pagination
      const totalCount =
        response.headers["x-total-count"] || response.data.length;
      const calculatedTotalPages = Math.ceil(totalCount / itemsPerPage);
      setTotalPages(calculatedTotalPages > 0 ? calculatedTotalPages : 1);

      setParsedData(response.data);
      setCurrentPage(page);
      setDataInitialized(true);
    } catch (error) {
      console.error("Error fetching drugs:", error);
      alert("Failed to load drugs from database.");
      // Still set initialized to true to prevent infinite loading attempts
      setDataInitialized(true);
      setParsedData([]);
    } finally {
      setIsLoading(false);
    }
  };

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
      try {
        // Check if there are ingredients to potentially add to canonical list
        if (drug.cleanedIngredients && drug.cleanedIngredients.length > 0) {
          // Add any new ingredients to the canonical list
          await addNewCanonicalIngredients(drug.cleanedIngredients);
        }

        // Update the drug in the database
        await updateDrug(drug);
      } catch (error) {
        console.error("Error during drug save:", error);
        alert("Failed to save drug. Please try again.");
      }
    } else {
      alert("Drug ID is missing. Cannot save.");
    }
  };

  // Add new row function
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

    // Add the new empty drug to the data
    setParsedData([...parsedData, emptyDrug]);
  };

  // Calculate current items based on mode
  let currentItems = parsedData;

  // Only apply local pagination in bulk mode
  if (mode === "bulk") {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    currentItems = parsedData.slice(indexOfFirstItem, indexOfLastItem);
  }

  // Modified pagination functions for database mode
  const paginateNext = () => {
    if (mode === "database") {
      console.log("Navigating to next page in database mode");
      if (currentPage < totalPages) {
        fetchDrugsFromDatabase(currentPage + 1);
      }
    } else {
      // Standard pagination for bulk edit mode
      if (currentPage < Math.ceil(parsedData.length / itemsPerPage)) {
        setCurrentPage(currentPage + 1);
      }
    }
  };

  const paginatePrev = () => {
    if (mode === "database") {
      console.log("Navigating to previous page in database mode");
      if (currentPage > 1) {
        fetchDrugsFromDatabase(currentPage - 1);
      }
    } else {
      // Standard pagination for bulk edit mode
      if (currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
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
        <h3>
          {mode === "single"
            ? "Edit Drug"
            : mode === "bulk"
            ? "Edit Uploaded Drugs"
            : "Edit Drug Database"}
        </h3>

        {isLoading ? (
          <div className="loading">Loading drugs...</div>
        ) : parsedData.length === 0 ? (
          <div className="no-data-message">
            <p>No drugs found. You can add a new drug entry.</p>
            <button onClick={addNewRow} className="add-row-button">
              Add New Drug
            </button>
          </div>
        ) : (
          <>
            {/* Instructions Box */}
            <div className="instructions-box">
              <p>
                <strong>Editing Ingredients:</strong> Edit cleaned ingredients
                by separating them with commas. Click on suggested ingredients
                to add them to the cleaned ingredients list.
              </p>
            </div>

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
                  <tr key={drug._id || `temp-${index}`}>
                    <td>
                      <input
                        type="text"
                        value={drug.name}
                        onChange={(e) =>
                          handleEdit(index, "name", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <textarea
                        value={drug.ingredients}
                        onChange={(e) =>
                          handleEdit(index, "ingredients", e.target.value)
                        }
                      />
                      <button
                        className="autoparse-button"
                        onClick={() => handleAutoParse(index)}
                      >
                        Autoparse
                      </button>
                    </td>
                    <td>
                      <textarea
                        value={formatCleanedIngredients(
                          drug.cleanedIngredients
                        )}
                        onChange={(e) =>
                          handleEdit(
                            index,
                            "cleanedIngredientsString",
                            e.target.value
                          )
                        }
                        placeholder="Cleaned ingredients"
                      />

                      {/* Ingredient Suggestions */}
                      <div className="ingredient-suggestions">
                        {drug.cleanedIngredients &&
                          drug.cleanedIngredients.length > 0 && (
                            <button
                              className="suggestions-button"
                              onClick={() => generateSuggestionsForDrug(index)}
                            >
                              Get Suggestions
                            </button>
                          )}

                        <div className="suggestions-list">
                          {ingredientSuggestions[index] &&
                            Object.entries(ingredientSuggestions[index]).map(
                              ([ingredient, suggestions]) => (
                                <div
                                  key={ingredient}
                                  className="suggestion-group"
                                >
                                  <div className="similar-ingredients">
                                    {suggestions.map((suggestion) => (
                                      <span
                                        key={suggestion.name}
                                        className="suggestion-item"
                                        onClick={() =>
                                          handleSuggestionClick(
                                            index,
                                            suggestion.name
                                          )
                                        }
                                      >
                                        {suggestion.name}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )
                            )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <button onClick={() => handleSave(index)}>Save</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div className="pagination">
              <button
                onClick={paginatePrev}
                disabled={currentPage === 1 || isLoading}
              >
                Previous
              </button>
              <span className="page-info">
                Page {currentPage} of{" "}
                {mode === "bulk"
                  ? Math.ceil(parsedData.length / itemsPerPage)
                  : totalPages}
              </span>
              <button
                onClick={paginateNext}
                disabled={
                  (mode === "bulk" &&
                    currentPage ===
                      Math.ceil(parsedData.length / itemsPerPage)) ||
                  (mode === "database" && currentPage === totalPages) ||
                  isLoading
                }
              >
                Next
              </button>
            </div>

            {/* Add New Row Button */}
            <button onClick={addNewRow} className="add-row-button">
              Add New Drug
            </button>

            {/* Only show upload button in bulk mode */}
            {mode === "bulk" && (
              <>
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
                  {uploading ? "Uploading..." : "Upload All"}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default EditCatalog;
