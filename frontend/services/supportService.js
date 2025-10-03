// src/services/supportService.js
import api from './api';

export const supportService = {
  // Create support ticket
  createTicket: async (ticketData) => {
    const response = await api.post('/support', ticketData);
    return response.data;
  },

  // Get user tickets
  getUserTickets: async () => {
    const response = await api.get('/support/my');
    return response.data;
  },

  // Get ticket by ID
  getTicketById: async (ticketId) => {
    const response = await api.get(`/support/${ticketId}`);
    return response.data;
  },

  // Add response to ticket
  addTicketResponse: async (ticketId, message) => {
    const response = await api.post(`/support/${ticketId}/response`, { message });
    return response.data;
  },

  // Close ticket
  closeTicket: async (ticketId) => {
    const response = await api.put(`/support/${ticketId}/close`);
    return response.data;
  }
};
