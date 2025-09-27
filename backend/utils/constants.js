const USER_ROLES = {
  BUYER: 'buyer',
  SELLER: 'seller',
  ADMIN: 'admin'
};

const ORDER_STATUS = {
  PLACED: 'placed',
  CONFIRMED: 'confirmed',
  PACKED: 'packed',
  SHIPPED: 'shipped',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  RETURNED: 'returned'
};

const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  PARTIAL_REFUND: 'partial_refund'
};

const BARGAIN_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  COUNTERED: 'countered',
  EXPIRED: 'expired'
};

const SUPPORT_CATEGORIES = {
  ORDER: 'order',
  PAYMENT: 'payment',
  TECHNICAL: 'technical',
  ACCOUNT: 'account',
  PRODUCT: 'product',
  GENERAL: 'general'
};

const NOTIFICATION_TYPES = {
  ORDER_PLACED: 'order_placed',
  ORDER_CONFIRMED: 'order_confirmed',
  ORDER_SHIPPED: 'order_shipped',
  ORDER_DELIVERED: 'order_delivered',
  BARGAIN_RECEIVED: 'bargain_received',
  BARGAIN_ACCEPTED: 'bargain_accepted',
  BARGAIN_REJECTED: 'bargain_rejected',
  BARGAIN_COUNTERED: 'bargain_countered',
  PAYMENT_RECEIVED: 'payment_received',
  PAYMENT_FAILED: 'payment_failed',
  NEW_REVIEW: 'new_review',
  SUPPORT_RESPONSE: 'support_response'
};

const CLOTHING_CATEGORIES = [
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

const PRODUCT_SIZES = {
  CLOTHING: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
  PANTS: ['28', '30', '32', '34', '36', '38', '40', '42'],
  SHOES: ['6', '7', '8', '9', '10', '11', '12']
};

const PAYMENT_METHODS = {
  CARD: 'card',
  UPI: 'upi',
  NETBANKING: 'netbanking',
  WALLET: 'wallet',
  COD: 'cod'
};

const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\d{10}$/,
  PINCODE: /^\d{6}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/
};

const DEFAULT_PAGINATION = {
  PAGE: 1,
  LIMIT: 10,
  MAX_LIMIT: 100
};

const FILE_UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
};

const PLATFORM_CONFIG = {
  FEE_PERCENTAGE: 5,
  SETTLEMENT_HOURS: 24,
  BARGAIN_EXPIRY_HOURS: 24,
  ORDER_CANCELLATION_HOURS: 1,
  REVIEW_EDIT_HOURS: 24
};

module.exports = {
  USER_ROLES,
  ORDER_STATUS,
  PAYMENT_STATUS,
  BARGAIN_STATUS,
  SUPPORT_CATEGORIES,
  NOTIFICATION_TYPES,
  CLOTHING_CATEGORIES,
  PRODUCT_SIZES,
  PAYMENT_METHODS,
  REGEX_PATTERNS,
  DEFAULT_PAGINATION,
  FILE_UPLOAD,
  PLATFORM_CONFIG
};
