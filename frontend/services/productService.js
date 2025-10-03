// src/services/productService.js
import api from './api';

export const productService = {
  // Get products by store
  getProductsByStore: async (storeId) => {
    const response = await api.get(`/products/store/${storeId}`);
    return response.data;
  },

  // Get product by ID
  getProductById: async (productId) => {
    const response = await api.get(`/products/${productId}`);
    return response.data;
  },

  // Search products
  searchProducts: async (params) => {
    const response = await api.get('/products/search', { params });
    return response.data;
  },

  // Get featured products
  getFeaturedProducts: async () => {
    const response = await api.get('/products/featured');
    return response.data;
  },

  // Get products by category
  getProductsByCategory: async (category) => {
    const response = await api.get(`/products/category/${category}`);
    return response.data;
  },

  // Add product (sellers only)
  addProduct: async (productData) => {
    const response = await api.post('/products', productData);
    return response.data;
  },

  // Update product
  updateProduct: async (productId, updates) => {
    const response = await api.put(`/products/${productId}`, updates);
    return response.data;
  },

  // Delete product
  deleteProduct: async (productId) => {
    const response = await api.delete(`/products/${productId}`);
    return response.data;
  },

  // Upload product images
  uploadProductImages: async (productId, files) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('images', file);
    });
    
    const response = await api.post(`/products/${productId}/images`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
};