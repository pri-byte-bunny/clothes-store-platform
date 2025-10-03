// src/utils/formatters.js
export const formatters = {
  price: (price) => formatCurrency(price),
  
  date: (date) => formatDate(date),
  
  dateTime: (date) => formatDateTime(date),
  
  distance: (distance) => formatDistance(distance),
  
  rating: (rating) => {
    if (!rating) return 'No rating';
    return `${rating.toFixed(1)} ⭐`;
  },
  
  orderStatus: (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  },
  
  phone: (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
    return phone;
  },
  
  fileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
};