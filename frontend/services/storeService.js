/ src/services/storeService.js
import api from './api';

export const storeService = {
  // Get nearby stores
  getNearbyStores: async (params) => {
    const response = await api.get('/stores/nearby', { params });
    return response.data;
  },

  // Get store by ID
  getStoreById: async (storeId) => {
    const response = await api.get(`/stores/${storeId}`);
    return response.data;
  },

  // Create store (sellers only)
  createStore: async (storeData) => {
    const response = await api.post('/stores', storeData);
    return response.data;
  },

  // Update store
  updateStore: async (storeId, updates) => {
    const response = await api.put(`/stores/${storeId}`, updates);
    return response.data;
  },

  // Upload store images
  uploadStoreImages: async (storeId, files) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('images', file);
    });
    
    const response = await api.post(`/stores/${storeId}/images`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get store reviews
  getStoreReviews: async (storeId) => {
    const response = await api.get(`/stores/${storeId}/reviews`);
    return response.data;
  },

  // Add store review
  addStoreReview: async (storeId, review) => {
    const response = await api.post(`/stores/${storeId}/reviews`, review);
    return response.data;
  }
};
