import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Navigation from '../Components/navigation.tsx';
import './displayCatalog.css';

interface Drug {
  _id: string;
  registrationNumber: string;
  name: string;
  ingredients: string;
  cleanedIngredients?: string[]; // Add cleaned ingredients
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

const DisplayCatalog: React.FC = () => {
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const limit = 24; // Number of drugs per page
  const navigate = useNavigate();

  axios.defaults.baseURL = 'http://localhost:4000'; // Changeable on deploy

  const fetchDrugs = async (pageNumber: number) => {
    setLoading(true);
    try {
      const response = await axios.get('/drugCatalog', {
        params: { page: pageNumber, limit },
      });
      const data: Drug[] = response.data;
      setHasMore(data.length === limit);
      setDrugs(data);
    } catch (error) {
      console.error('Error fetching drug catalog:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrugs(page);
  }, [page]);

  const loadMore = () => {
    setPage((prevPage) => prevPage + 1);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this drug?')) {
      try {
        await axios.delete(`/drugCatalog/${id}`);
        setDrugs((prevDrugs) => prevDrugs.filter((drug) => drug._id !== id)); // Remove from UI
      } catch (error) {
        console.error('Error deleting drug:', error);
        alert('Failed to delete drug. Please try again.');
      }
    }
  };

  const handleEdit = (drug: Drug) => {
    navigate(`/edit/${drug._id}`); // Pass the drug object as state
  };

  // Format cleaned ingredients for display
  const formatCleanedIngredients = (ingredients?: string[]) => {
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return "None";
    }
    return ingredients.join(", ");
  };

  return (
    <div>
      <Navigation />
      <div className="display-container">
        <h3>Drug Catalog</h3>
        <div className="drug-grid">
          {drugs.map((drug) => (
            <div key={drug._id} className="drug-card">
              <p><strong>Registration Number:</strong> {drug.registrationNumber}</p>
              <p><strong>Name:</strong> {drug.name}</p>
              <p><strong>Raw Ingredients:</strong> {drug.ingredients}</p>
              <p><strong>Cleaned Ingredients:</strong> {formatCleanedIngredients(drug.cleanedIngredients)}</p>
              <p><strong>Manufacturing Requirements:</strong> {drug.manufacturingRequirements}</p>
              <p><strong>Unit of Measure:</strong> {drug.unitOfMeasure}</p>
              {drug.estimatedPrice !== undefined && (
                <p><strong>Estimated Price:</strong> {drug.estimatedPrice}</p>
              )}
              <p><strong>Manufacturer:</strong> {drug.manufacturer}</p>
              <p><strong>Distributor:</strong> {drug.distributor}</p>
              <p><strong>Year of Registration:</strong> {drug.yearOfRegistration}</p>
              <p><strong>Country of Origin:</strong> {drug.countryOfOrigin}</p>
              <p><strong>Usage Form:</strong> {drug.usageForm}</p>
              {drug.contentOfReview && (
                <p><strong>Content of Review:</strong> {drug.contentOfReview}</p>
              )}
              {drug.noProposalsOnPrice && (
                <p><strong>No Proposals on Price:</strong> {drug.noProposalsOnPrice}</p>
              )}
              {drug.dateOfProposolsOnPrice && (
                <p><strong>Date of Proposals on Price:</strong> {drug.dateOfProposolsOnPrice}</p>
              )}
              {drug.additionalNotes && (
                <p><strong>Additional Notes:</strong> {drug.additionalNotes}</p>
              )}
              {/* Edit and Delete Buttons */}
              <div className="drug-actions">
                <button onClick={() => handleEdit(drug)}>Edit</button>
                <button onClick={() => handleDelete(drug._id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
        {loading && <p>Loading...</p>}
        <div className="pagination">
          <button onClick={() => setPage((prevPage) => (prevPage > 1 ? prevPage - 1 : 1))} disabled={page === 1}>
            &larr;
          </button>
          <span className="page-info">Page {page}</span>
          <button onClick={loadMore} disabled={!hasMore || loading}>
            &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};

export default DisplayCatalog;