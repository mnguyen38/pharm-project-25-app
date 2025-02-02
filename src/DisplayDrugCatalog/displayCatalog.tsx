import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Navigation from '../Components/navigation.tsx';
import './displayCatalog.css';

interface Drug {
  registrationNumber: string;
  name: string;
  ingredients: string;
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
  const limit = 24; // can become an editable field
  axios.defaults.baseURL = 'http://localhost:4000'; // changable on deploy

  const fetchDrugs = async (pageNumber: number) => {
    setLoading(true);
    try {
      const response = await axios.get('/drugCatalog', {
        params: { page: pageNumber, limit }
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
    setPage(prevPage => prevPage + 1);
  };

  return (
    <div>
      <Navigation />
      <div className="display-container">
        <h3>Drug Catalog</h3>
        <div className="drug-grid">
          {drugs.map((drug, index) => (
            <div key={index} className="drug-card">
              <p><strong>Registration Number:</strong> {drug.registrationNumber}</p>
              <p><strong>Name:</strong> {drug.name}</p>
              <p><strong>Ingredients:</strong> {drug.ingredients}</p>
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
            </div>
          ))}
        </div>
        {loading && <p>Loading...</p>}
        <div className="pagination">
          <button onClick={() => setPage(page > 1 ? page - 1 : 1)} disabled={page === 1}>
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
