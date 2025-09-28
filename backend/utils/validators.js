// utils/validators.js
const validator = require('validator');

// Define REGEX_PATTERNS locally if constants file is not available
const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\d{10}$/,
  PINCODE: /^\d{6}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/
};

class Validators {
  // Email validation
  static email(email) {
    if (!email) return { isValid: false, message: 'Email is required' };
    if (!validator.isEmail(email)) {
      return { isValid: false, message: 'Please provide a valid email address' };
    }
    return { isValid: true };
  }

  // Phone validation
  static phone(phone) {
    if (!phone) return { isValid: false, message: 'Phone number is required' };
    if (!REGEX_PATTERNS.PHONE.test(phone)) {
      return { isValid: false, message: 'Phone number must be 10 digits' };
    }
    return { isValid: true };
  }

  // Password validation
  static password(password) {
    if (!password) return { isValid: false, message: 'Password is required' };
    if (password.length < 8) {
      return { isValid: false, message: 'Password must be at least 8 characters long' };
    }
    if (!REGEX_PATTERNS.PASSWORD.test(password)) {
      return { 
        isValid: false, 
        message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' 
      };
    }
    return { isValid: true };
  }

  // PIN code validation
  static pincode(pincode) {
    if (!pincode) return { isValid: false, message: 'PIN code is required' };
    if (!REGEX_PATTERNS.PINCODE.test(pincode)) {
      return { isValid: false, message: 'PIN code must be 6 digits' };
    }
    return { isValid: true };
  }

  // Name validation
  static name(name) {
    if (!name) return { isValid: false, message: 'Name is required' };
    if (name.trim().length < 2) {
      return { isValid: false, message: 'Name must be at least 2 characters long' };
    }
    if (name.trim().length > 50) {
      return { isValid: false, message: 'Name cannot exceed 50 characters' };
    }
    if (!/^[a-zA-Z\s]+$/.test(name)) {
      return { isValid: false, message: 'Name can only contain letters and spaces' };
    }
    return { isValid: true };
  }

  // Price validation
  static price(price) {
    if (price === undefined || price === null) {
      return { isValid: false, message: 'Price is required' };
    }
    if (typeof price !== 'number' || price < 0) {
      return { isValid: false, message: 'Price must be a positive number' };
    }
    if (price > 1000000) {
      return { isValid: false, message: 'Price cannot exceed ₹10,00,000' };
    }
    return { isValid: true };
  }

  // URL validation
  static url(url) {
    if (!url) return { isValid: true }; // Optional field
    if (!validator.isURL(url)) {
      return { isValid: false, message: 'Please provide a valid URL' };
    }
    return { isValid: true };
  }

  // Coordinates validation
  static coordinates(latitude, longitude) {
    if (latitude === undefined || longitude === undefined) {
      return { isValid: false, message: 'Latitude and longitude are required' };
    }
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return { isValid: false, message: 'Coordinates must be numbers' };
    }
    if (latitude < -90 || latitude > 90) {
      return { isValid: false, message: 'Latitude must be between -90 and 90' };
    }
    if (longitude < -180 || longitude > 180) {
      return { isValid: false, message: 'Longitude must be between -180 and 180' };
    }
    return { isValid: true };
  }

  // Validate object with rules
  static validateObject(data, rules) {
    const errors = {};
    let isValid = true;

    Object.keys(rules).forEach(field => {
      const rule = rules[field];
      const value = data[field];

      // Check if required
      if (rule.required && (!value || value.toString().trim() === '')) {
        errors[field] = `${field} is required`;
        isValid = false;
        return;
      }

      // Skip validation if field is optional and empty
      if (!rule.required && (!value || value.toString().trim() === '')) {
        return;
      }

      // Apply specific validations
      if (rule.type === 'email') {
        const result = this.email(value);
        if (!result.isValid) {
          errors[field] = result.message;
          isValid = false;
        }
      }

      if (rule.type === 'phone') {
        const result = this.phone(value);
        if (!result.isValid) {
          errors[field] = result.message;
          isValid = false;
        }
      }

      if (rule.type === 'password') {
        const result = this.password(value);
        if (!result.isValid) {
          errors[field] = result.message;
          isValid = false;
        }
      }

      if (rule.type === 'name') {
        const result = this.name(value);
        if (!result.isValid) {
          errors[field] = result.message;
          isValid = false;
        }
      }

      if (rule.type === 'price') {
        const result = this.price(value);
        if (!result.isValid) {
          errors[field] = result.message;
          isValid = false;
        }
      }

      if (rule.type === 'url') {
        const result = this.url(value);
        if (!result.isValid) {
          errors[field] = result.message;
          isValid = false;
        }
      }

      // Length validations
      if (rule.minLength && value.toString().length < rule.minLength) {
        errors[field] = `${field} must be at least ${rule.minLength} characters long`;
        isValid = false;
      }

      if (rule.maxLength && value.toString().length > rule.maxLength) {
        errors[field] = `${field} cannot exceed ${rule.maxLength} characters`;
        isValid = false;
      }

      // Numeric validations
      if (rule.min !== undefined && Number(value) < rule.min) {
        errors[field] = `${field} must be at least ${rule.min}`;
        isValid = false;
      }

      if (rule.max !== undefined && Number(value) > rule.max) {
        errors[field] = `${field} cannot exceed ${rule.max}`;
        isValid = false;
      }

      // Enum validation
      if (rule.enum && !rule.enum.includes(value)) {
        errors[field] = `${field} must be one of: ${rule.enum.join(', ')}`;
        isValid = false;
      }

      // Custom validation function
      if (rule.custom && typeof rule.custom === 'function') {
        const result = rule.custom(value, data);
        if (!result.isValid) {
          errors[field] = result.message;
          isValid = false;
        }
      }
    });

    return { isValid, errors };
  }

  // Validation rules for common entities
  static getUserValidationRules() {
    return {
      name: { required: true, type: 'name' },
      email: { required: true, type: 'email' },
      password: { required: true, type: 'password' },
      phone: { required: true, type: 'phone' },
      role: { required: true, enum: ['buyer', 'seller', 'admin'] }
    };
  }

  static getStoreValidationRules() {
    return {
      storeName: { required: true, minLength: 2, maxLength: 100 },
      description: { required: false, maxLength: 1000 },
      'address.street': { required: true, minLength: 5 },
      'address.city': { required: true, minLength: 2 },
      'address.state': { required: true, minLength: 2 },
      'address.pincode': { required: true, type: 'pincode' }
    };
  }

  static getProductValidationRules() {
    return {
      name: { required: true, minLength: 2, maxLength: 200 },
      description: { required: false, maxLength: 2000 },
      category: { required: true, minLength: 2 },
      price: { required: true, type: 'price' },
      stock: { required: false, min: 0 },
      storeId: { required: true }
    };
  }

  static getOrderValidationRules() {
    return {
      products: { required: true },
      'shippingAddress.name': { required: true, type: 'name' },
      'shippingAddress.phone': { required: true, type: 'phone' },
      'shippingAddress.street': { required: true, minLength: 5 },
      'shippingAddress.city': { required: true, minLength: 2 },
      'shippingAddress.pincode': { required: true, type: 'pincode' },
      paymentMethod: { required: true, enum: ['card', 'upi', 'netbanking', 'wallet', 'cod'] }
    };
  }

  // Sanitize input data
  static sanitizeData(data) {
    const sanitized = {};
    
    Object.keys(data).forEach(key => {
      const value = data[key];
      
      if (typeof value === 'string') {
        // Trim whitespace
        sanitized[key] = value.trim();
        
        // Convert email to lowercase
        if (key === 'email' || key.includes('email')) {
          sanitized[key] = sanitized[key].toLowerCase();
        }
        
        // Remove non-numeric characters from phone
        if (key === 'phone' || key.includes('phone')) {
          sanitized[key] = sanitized[key].replace(/\D/g, '');
        }
        
        // Clean up URLs
        if (key.includes('url') || key.includes('website')) {
          if (sanitized[key] && !sanitized[key].startsWith('http')) {
            sanitized[key] = 'https://' + sanitized[key];
          }
        }
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Recursively sanitize nested objects
        sanitized[key] = this.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    });
    
    return sanitized;
  }

  // Cross-field validation
  static validatePasswords(password, confirmPassword) {
    const passwordValidation = this.password(password);
    if (!passwordValidation.isValid) {
      return passwordValidation;
    }

    if (password !== confirmPassword) {
      return { isValid: false, message: 'Passwords do not match' };
    }

    return { isValid: true };
  }

  // Validate price range
  static validatePriceRange(minPrice, maxPrice) {
    const errors = {};
    let isValid = true;

    if (minPrice !== undefined) {
      const minResult = this.price(minPrice);
      if (!minResult.isValid) {
        errors.minPrice = minResult.message;
        isValid = false;
      }
    }

    if (maxPrice !== undefined) {
      const maxResult = this.price(maxPrice);
      if (!maxResult.isValid) {
        errors.maxPrice = maxResult.message;
        isValid = false;
      }
    }

    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      errors.priceRange = 'Minimum price cannot be greater than maximum price';
      isValid = false;
    }

    return { isValid, errors };
  }

  // Validate discount price
  static validateDiscountPrice(originalPrice, discountPrice) {
    if (discountPrice === undefined || discountPrice === null) {
      return { isValid: true }; // Optional field
    }

    const priceResult = this.price(discountPrice);
    if (!priceResult.isValid) {
      return priceResult;
    }

    if (discountPrice >= originalPrice) {
      return { 
        isValid: false, 
        message: 'Discount price must be less than original price' 
      };
    }

    return { isValid: true };
  }
}

module.exports = Validators;

// Example usage:
/*
const Validators = require('./validators');

// Single field validation
const emailResult = Validators.email('test@example.com');
console.log(emailResult); // { isValid: true }

// Object validation with rules
const userData = {
  name: 'John Doe',
  email: 'john@example.com',
  password: 'Password123',
  phone: '9876543210',
  role: 'buyer'
};

const userRules = Validators.getUserValidationRules();
const result = Validators.validateObject(userData, userRules);
console.log(result); // { isValid: true, errors: {} }

// Sanitize data
const sanitizedData = Validators.sanitizeData({
  email: '  USER@EXAMPLE.COM  ',
  phone: '+91-98765-43210',
  website: 'example.com'
});
console.log(sanitizedData);
// {
//   email: 'user@example.com',
//   phone: '9876543210',
//   website: 'https://example.com'
// }
*/