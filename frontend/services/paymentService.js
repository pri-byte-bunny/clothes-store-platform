// src/services/paymentService.js
import api from './api';

export const paymentService = {
  // Create payment order
  createPaymentOrder: async (orderData) => {
    const response = await api.post('/payment/create-order', orderData);
    return response.data;
  },

  // Verify payment
  verifyPayment: async (paymentData) => {
    const response = await api.post('/payment/verify', paymentData);
    return response.data;
  },

  // Process payment
  processPayment: async (paymentData) => {
    const response = await api.post('/payment/process', paymentData);
    return response.data;
  },

  // Get payment methods
  getPaymentMethods: async () => {
    const response = await api.get('/payment/methods');
    return response.data;
  },

  // Get transaction history
  getTransactionHistory: async () => {
    const response = await api.get('/payment/transactions');
    return response.data;
  }
};