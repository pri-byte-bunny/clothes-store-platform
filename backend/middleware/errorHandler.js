const config = require('../config/config');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    let message = 'Duplicate field value entered';
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    
    if (field === 'email') {
      message = 'Email address already exists';
    } else if (field === 'phone') {
      message = 'Phone number already exists';
    } else {
      message = `${field} '${value}' already exists`;
    }
    
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(val => val.message);
    const message = errors.join(', ');
    error = { message, statusCode: 400 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token. Please login again.';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired. Please login again.';
    error = { message, statusCode: 401 };
  }

  // Multer errors
  if (err.name === 'MulterError') {
    let message = 'File upload error';
    
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File too large. Maximum size is 5MB.';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Too many files. Maximum is 10 files.';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Unexpected file field.';
    }
    
    error = { message, statusCode: 400 };
  }

  // Express validator errors
  if (err.type === 'entity.parse.failed') {
    const message = 'Invalid JSON in request body';
    error = { message, statusCode: 400 };
  }

  // File system errors
  if (err.code === 'ENOENT') {
    const message = 'File not found';
    error = { message, statusCode: 404 };
  }

  if (err.code === 'EACCES') {
    const message = 'Permission denied';
    error = { message, statusCode: 403 };
  }

  // Rate limiting errors
  if (err.type === 'request-rate-limited') {
    const message = 'Too many requests. Please try again later.';
    error = { message, statusCode: 429 };
  }

  // Payment gateway errors
  if (err.code === 'PAYMENT_FAILED') {
    const message = 'Payment processing failed. Please try again.';
    error = { message, statusCode: 402 };
  }

  // Database connection errors
  if (err.name === 'MongooseServerSelectionError') {
    const message = 'Database connection failed';
    error = { message, statusCode: 503 };
  }

  if (err.name === 'MongooseTimeoutError') {
    const message = 'Database operation timed out';
    error = { message, statusCode: 503 };
  }

  // Custom application errors
  if (err.name === 'AppError') {
    error = { message: err.message, statusCode: err.statusCode };
  }

  // Default error response
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  // Send error response
  res.status(statusCode).json({
    success: false,
    message,
    ...(config.NODE_ENV === 'development' && {
      error: err,
      stack: err.stack
    })
  });

  // Log critical errors
  if (statusCode >= 500) {
    console.error('Critical Error:', {
      message: err.message,
      stack: err.stack,
      statusCode,
      url: req.url,
      method: req.method,
      body: req.body,
      params: req.params,
      query: req.query,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
  }
};

// Custom error class
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Async error handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { errorHandler, AppError, asyncHandler };

// middleware/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const config = require('../config/config');

// Ensure upload directories exist
const createUploadDirs = () => {
  const dirs = [
    config.upload.uploadDir,
    path.join(config.upload.uploadDir, 'products'),
    path.join(config.upload.uploadDir, 'stores'),
    path.join(config.upload.uploadDir, 'support'),
    path.join(config.upload.uploadDir, 'profiles'),
    path.join(config.upload.uploadDir, 'temp')
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });
};

// Initialize upload directories
createUploadDirs();

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = config.upload.uploadDir;
    
    // Determine upload path based on route
    if (req.route.path.includes('products')) {
      uploadPath = path.join(uploadPath, 'products');
    } else if (req.route.path.includes('stores')) {
      uploadPath = path.join(uploadPath, 'stores');
    } else if (req.route.path.includes('support')) {
      uploadPath = path.join(uploadPath, 'support');
    } else if (req.route.path.includes('profile')) {
      uploadPath = path.join(uploadPath, 'profiles');
    } else {
      uploadPath = path.join(uploadPath, 'temp');
    }
    
    cb(null, uploadPath);
  },
  
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = crypto.randomBytes(6).toString('hex');
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    const basename = path.basename(file.originalname, extension);
    
    // Sanitize filename
    const sanitizedBasename = basename
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 20);
    
    const filename = `${sanitizedBasename}-${timestamp}-${uniqueSuffix}${extension}`;
    cb(null, filename);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    ...config.upload.allowedImageTypes,
    ...config.upload.allowedDocTypes
  ];
  
  // Check MIME type
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error(`Invalid file type: ${file.mimetype}. Allowed types: ${allowedTypes.join(', ')}`);
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

// Image-only filter
const imageFilter = (req, file, cb) => {
  if (config.upload.allowedImageTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error(`Invalid image type: ${file.mimetype}. Allowed types: ${config.upload.allowedImageTypes.join(', ')}`);
    error.code = 'INVALID_IMAGE_TYPE';
    cb(error, false);
  }
};

// Document-only filter
const documentFilter = (req, file, cb) => {
  if (config.upload.allowedDocTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error(`Invalid document type: ${file.mimetype}. Allowed types: ${config.upload.allowedDocTypes.join(', ')}`);
    error.code = 'INVALID_DOCUMENT_TYPE';
    cb(error, false);
  }
};

// Multer configurations
const upload = multer({
  storage: storage,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: config.upload.maxFiles
  },
  fileFilter: fileFilter
});

const uploadImages = multer({
  storage: storage,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: config.upload.maxFiles
  },
  fileFilter: imageFilter
});

const uploadDocuments = multer({
  storage: storage,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: config.upload.maxFiles
  },
  fileFilter: documentFilter
});

// Error handling middleware for multer
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `File too large. Maximum size is ${(config.upload.maxFileSize / (1024 * 1024)).toFixed(1)}MB.`
      });
    }
    
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: `Too many files. Maximum is ${config.upload.maxFiles} files.`
      });
    }
    
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field.'
      });
    }
    
    return res.status(400).json({
      success: false,
      message: 'File upload error: ' + err.message
    });
  }
  
  if (err && (err.code === 'INVALID_FILE_TYPE' || err.code === 'INVALID_IMAGE_TYPE' || err.code === 'INVALID_DOCUMENT_TYPE')) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  next();
};

// Utility functions
const deleteFile = (filename) => {
  return new Promise((resolve, reject) => {
    const filePath = path.join(config.upload.uploadDir, filename);
    
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error('Error deleting file:', err);
        reject(err);
      } else {
        console.log('File deleted:', filename);
        resolve();
      }
    });
  });
};

const deleteFiles = (filenames) => {
  return Promise.all(filenames.map(filename => deleteFile(filename)));
};

const getFileUrl = (filename) => {
  if (!filename) return null;
  return `${process.env.API_URL || 'http://localhost:3001'}/uploads/${filename}`;
};

const getFileInfo = (filePath) => {
  return new Promise((resolve, reject) => {
    fs.stat(filePath, (err, stats) => {
      if (err) {
        reject(err);
      } else {
        resolve({
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          isFile: stats.isFile(),
          isDirectory: stats.isDirectory()
        });
      }
    });
  });
};

// Clean up temporary files (older than 24 hours)
const cleanupTempFiles = () => {
  const tempDir = path.join(config.upload.uploadDir, 'temp');
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  
  fs.readdir(tempDir, (err, files) => {
    if (err) {
      console.error('Error reading temp directory:', err);
      return;
    }
    
    files.forEach(file => {
      const filePath = path.join(tempDir, file);
      
      fs.stat(filePath, (err, stats) => {
        if (err) return;
        
        if (stats.mtime.getTime() < oneDayAgo) {
          fs.unlink(filePath, (err) => {
            if (err) {
              console.error('Error deleting temp file:', err);
            } else {
              console.log('Deleted temp file:', file);
            }
          });
        }
      });
    });
  });
};

// Schedule cleanup job (every 6 hours)
setInterval(cleanupTempFiles, 6 * 60 * 60 * 1000);

module.exports = {
  upload,
  uploadImages,
  uploadDocuments,
  handleUploadError,
  deleteFile,
  deleteFiles,
  getFileUrl,
  getFileInfo,
  cleanupTempFiles
};