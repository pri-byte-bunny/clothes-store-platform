// src/utils/validators.js
export const validators = {
  required: (value) => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return 'This field is required';
    }
    return null;
  },

  email: (value) => {
    if (value && !validateEmail(value)) {
      return 'Please enter a valid email address';
    }
    return null;
  },

  phone: (value) => {
    if (value && !validatePhone(value)) {
      return 'Please enter a valid 10-digit phone number';
    }
    return null;
  },

  minLength: (min) => (value) => {
    if (value && value.length < min) {
      return `Must be at least ${min} characters long`;
    }
    return null;
  },

  maxLength: (max) => (value) => {
    if (value && value.length > max) {
      return `Must be no more than ${max} characters long`;
    }
    return null;
  },

  min: (min) => (value) => {
    if (value && parseFloat(value) < min) {
      return `Must be at least ${min}`;
    }
    return null;
  },

  max: (max) => (value) => {
    if (value && parseFloat(value) > max) {
      return `Must be no more than ${max}`;
    }
    return null;
  },

  passwordStrength: (value) => {
    if (!value) return null;
    
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumbers = /\d/.test(value);
    const hasNonalphas = /\W/.test(value);
    
    if (value.length < minLength) {
      return `Password must be at least ${minLength} characters long`;
    }
    
    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      return 'Password must contain uppercase, lowercase, and numbers';
    }
    
    return null;
  },

  matchField: (fieldName) => (value, allValues) => {
    if (value !== allValues[fieldName]) {
      return `Must match ${fieldName}`;
    }
    return null;
  }
};