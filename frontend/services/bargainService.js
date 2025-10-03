// src/services/bargainService.js
import api from './api';

export const bargainService = {
  // Create bargain request
  createBargain: async (bargainData) => {
    const response = await api.post('/bargains', bargainData);
    return response.data;
  },

  // Get user bargains
  getUserBargains: async () => {
    const response = await api.get('/bargains/my');
    return response.data;
  },

  // Respond to bargain (sellers only)
  respondToBargain: async (bargainId, response) => {
    const apiResponse = await api.put(`/bargains/${bargainId}`, response);
    return apiResponse.data;
  },

  // Accept bargain
  acceptBargain: async (bargainId) => {
    const response = await api.put(`/bargains/${bargainId}/accept`);
    return response.data;
  },

  // Reject bargain
  rejectBargain: async (bargainId, reason) => {
    const response = await api.put(`/bargains/${bargainId}/reject`, { reason });
    return response.data;
  },

  // Counter bargain
  counterBargain: async (bargainId, counterOffer) => {
    const response = await api.put(`/bargains/${bargainId}/counter`, { counterOffer });
    return response.data;
  }
};