// src/services/orderService.js
import api from './api';

export const orderService = {
  // Create order
  createOrder: async (orderData) => {
    const response = await api.post('/orders', orderData);
    return response.data;
  },

  // Get user orders
  getUserOrders: async () => {
    const response = await api.get('/orders/my');
    return response.data;
  },

  // Get order by ID
  getOrderById: async (orderId) => {
    const response = await api.get(`/orders/${orderId}`);
    return response.data;
  },

  // Update order status (sellers only)
  updateOrderStatus: async (orderId, status) => {
    const response = await api.put(`/orders/${orderId}/status`, { status });
    return response.data;
  },

  // Cancel order
  cancelOrder: async (orderId, reason) => {
    const response = await api.put(`/orders/${orderId}/cancel`, { reason });
    return response.data;
  },

  // Track order
  trackOrder: async (orderId) => {
    const response = await api.get(`/orders/${orderId}/tracking`);
    return response.data;
  }
};