const crypto = require('crypto');
const moment = require('moment');

// Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
};

// Generate unique ID
const generateUniqueId = (prefix = '') => {
  const timestamp = Date.now().toString();
  const random = crypto.randomBytes(3).toString('hex');
  return `${prefix}${timestamp}${random}`.toUpperCase();
};

// Format currency
const formatCurrency = (amount, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(amount);
};

// Validate email
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate phone number
const isValidPhone = (phone) => {
  const phoneRegex = /^\d{10}$/;
  return phoneRegex.test(phone);
};

// Generate OTP
const generateOTP = (length = 6) => {
  return Math.floor(Math.random() * Math.pow(10, length)).toString().padStart(length, '0');
};

// Sanitize filename
const sanitizeFilename = (filename) => {
  return filename.replace(/[^a-zA-Z0-9.-]/g, '_');
};

// Parse pagination params
const parsePaginationParams = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const skip = (page - 1) * limit;
  
  return { page, limit, skip };
};

// Build pagination response
const buildPaginationResponse = (data, total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  
  return {
    data,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: total,
      itemsPerPage: limit,
      hasNextPage,
      hasPrevPage,
      nextPage: hasNextPage ? page + 1 : null,
      prevPage: hasPrevPage ? page - 1 : null
    }
  };
};

// Generate slug from text
const generateSlug = (text) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Check if time is within business hours
const isWithinBusinessHours = (businessHours, timezone = 'Asia/Kolkata') => {
  const now = moment().tz(timezone);
  const currentDay = now.format('dddd').toLowerCase();
  const currentTime = now.format('HH:mm');
  
  const dayHours = businessHours[currentDay];
  if (!dayHours || dayHours.closed) return false;
  
  return currentTime >= dayHours.open && currentTime <= dayHours.close;
};

// Mask sensitive data
const maskEmail = (email) => {
  const [local, domain] = email.split('@');
  const maskedLocal = local.length > 2 
    ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
    : local;
  return `${maskedLocal}@${domain}`;
};

const maskPhone = (phone) => {
  return phone.length > 4 
    ? '*'.repeat(phone.length - 4) + phone.slice(-4)
    : phone;
};

// Format time ago
const timeAgo = (date) => {
  return moment(date).fromNow();
};

// Calculate platform fee
const calculatePlatformFee = (amount, feePercentage = 5) => {
  return Math.round((amount * feePercentage) / 100 * 100) / 100;
};

// Validate coordinates
const isValidCoordinates = (latitude, longitude) => {
  return (
    latitude >= -90 && latitude <= 90 &&
    longitude >= -180 && longitude <= 180
  );
};

// Deep clone object
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

// Remove empty fields from object
const removeEmptyFields = (obj) => {
  const cleaned = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== null && obj[key] !== undefined && obj[key] !== '') {
      if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        const nestedCleaned = removeEmptyFields(obj[key]);
        if (Object.keys(nestedCleaned).length > 0) {
          cleaned[key] = nestedCleaned;
        }
      } else {
        cleaned[key] = obj[key];
      }
    }
  });
  return cleaned;
};

module.exports = {
  calculateDistance,
  generateUniqueId,
  formatCurrency,
  isValidEmail,
  isValidPhone,
  generateOTP,
  sanitizeFilename,
  parsePaginationParams,
  buildPaginationResponse,
  generateSlug,
  isWithinBusinessHours,
  maskEmail,
  maskPhone,
  timeAgo,
  calculatePlatformFee,
  isValidCoordinates,
  deepClone,
  removeEmptyFields
};
