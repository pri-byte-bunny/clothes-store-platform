const validateRegistration = (req, res, next) => {
  const { name, email, password, phone, role } = req.body;
  
  const errors = [];
  
  if (!name || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }
  
  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    errors.push('Valid email is required');
  }
  
  if (!password || password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  
  if (!phone || !/^\d{10}$/.test(phone)) {
    errors.push('Phone number must be 10 digits');
  }
  
  if (!role || !['buyer', 'seller'].includes(role)) {
    errors.push('Role must be either buyer or seller');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({ message: 'Validation failed', errors });
  }
  
  next();
};

const validateProduct = (req, res, next) => {
  const { name, price, category, storeId } = req.body;
  
  const errors = [];
  
  if (!name || name.trim().length < 2) {
    errors.push('Product name is required');
  }
  
  if (!price || price <= 0) {
    errors.push('Valid price is required');
  }
  
  if (!category || category.trim().length < 2) {
    errors.push('Category is required');
  }
  
  if (!storeId) {
    errors.push('Store ID is required');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({ message: 'Validation failed', errors });
  }
  
  next();
};

module.exports = { validateRegistration, validateProduct };
