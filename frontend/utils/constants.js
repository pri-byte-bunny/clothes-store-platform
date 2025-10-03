// src/utils/constants.js
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  VERIFY_TOKEN: '/auth/verify',
  
  // Stores
  STORES_NEARBY: '/stores/nearby',
  STORES: '/stores',
  
  // Products
  PRODUCTS: '/products',
  PRODUCTS_SEARCH: '/products/search',
  
  // Orders
  ORDERS: '/orders',
  
  // Bargains
  BARGAINS: '/bargains',
  
  // Support
  SUPPORT: '/support',
  
  // Payment
  PAYMENT: '/payment'
};

export const USER_ROLES = {
  BUYER: 'buyer',
  SELLER: 'seller',
  ADMIN: 'admin'
};

export const ORDER_STATUS = {
  PLACED: 'placed',
  CONFIRMED: 'confirmed',
  PACKED: 'packed',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
};

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded'
};

export const BARGAIN_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  COUNTERED: 'countered'
};

export const SUPPORT_CATEGORIES = {
  ORDER: 'order',
  PAYMENT: 'payment',
  TECHNICAL: 'technical',
  GENERAL: 'general'
};

export const CLOTHING_CATEGORIES = [
  'T-Shirts',
  'Shirts',
  'Jeans',
  'Trousers',
  'Dresses',
  'Skirts',
  'Jackets',
  'Sweaters',
  'Kurtas',
  'Sarees',
  'Lehengas',
  'Traditional',
  'Sportswear',
  'Formal',
  'Casual'
];

export const PRODUCT_SIZES = {
  CLOTHING: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
  PANTS: ['28', '30', '32', '34', '36', '38', '40', '42'],
  SHOES: ['6', '7', '8', '9', '10', '11', '12']
};

export const COLORS = [
  'Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 
  'Orange', 'Purple', 'Pink', 'Brown', 'Gray', 'Navy',
  'Maroon', 'Olive', 'Teal', 'Beige', 'Cream', 'Gold'
];

export const DEFAULT_LOCATION = {
  latitude: 23.3441,
  longitude: 85.3096,
  city: 'Ranchi',
  state: 'Jharkhand',
  country: 'India'
};
