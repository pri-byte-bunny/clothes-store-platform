const multer = require('multer');
const path = require('path');
const { imageHelpers } = require('../config/cloudinary');

// Configure memory storage for Cloudinary upload
const memoryStorage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Base multer configuration
const baseUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10 // Maximum 10 files at once
  },
  fileFilter
});

// Upload configurations for different use cases
const uploadConfig = {
  // Single image upload
  single: (fieldName) => baseUpload.single(fieldName),
  
  // Multiple images upload
  multiple: (fieldName, maxCount = 10) => baseUpload.array(fieldName, maxCount),
  
  // Multiple fields upload
  fields: (fields) => baseUpload.fields(fields),
  
  // Product images upload (multiple with specific field names)
  productImages: baseUpload.fields([
    { name: 'images', maxCount: 10 },
    { name: 'thumbnail', maxCount: 1 }
  ]),
  
  // Store logo upload
  storeLogo: baseUpload.single('logo'),
  
  // User avatar upload
  userAvatar: baseUpload.single('avatar'),
  
  // Category image upload
  categoryImage: baseUpload.single('image')
};

// Middleware to handle upload errors
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 5MB.'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many files. Maximum 10 files allowed.'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: 'Unexpected field name in file upload.'
        });
      default:
        return res.status(400).json({
          success: false,
          message: 'File upload error.',
          error: error.message
        });
    }
  }
  
  if (error.message === 'Only image files are allowed!') {
    return res.status(400).json({
      success: false,
      message: 'Only image files (jpg, jpeg, png, gif, webp) are allowed.'
    });
  }
  
  // Pass other errors to general error handler
  next(error);
};

// Middleware to process uploaded files and upload to Cloudinary
const processCloudinaryUpload = (options = {}) => {
  return async (req, res, next) => {
    try {
      // Single file upload
      if (req.file) {
        const uploadedImage = await imageHelpers.processSingleUpload(req.file, options);
        req.uploadedImage = uploadedImage;
      }
      
      // Multiple files upload
      if (req.files) {
        if (Array.isArray(req.files)) {
          // Files uploaded as array (from upload.array())
          const uploadedImages = await imageHelpers.processUploads(req.files, options);
          req.uploadedImages = uploadedImages;
        } else {
          // Files uploaded as object (from upload.fields())
          req.uploadedFiles = {};
          
          for (const [fieldName, files] of Object.entries(req.files)) {
            if (files && files.length > 0) {
              if (files.length === 1) {
                // Single file in field
                const uploadedImage = await imageHelpers.processSingleUpload(files[0], options);
                req.uploadedFiles[fieldName] = uploadedImage;
              } else {
                // Multiple files in field
                const uploadedImages = await imageHelpers.processUploads(files, options);
                req.uploadedFiles[fieldName] = uploadedImages;
              }
            }
          }
        }
      }
      
      next();
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Image upload failed',
        error: error.message
      });
    }
  };
};

// Middleware to validate image dimensions (optional)
const validateImageDimensions = (minWidth = 100, minHeight = 100, maxWidth = 5000, maxHeight = 5000) => {
  return (req, res, next) => {
    // This validation would need to be implemented using a library like 'sharp'
    // For now, we'll rely on Cloudinary's transformations
    next();
  };
};

// Middleware to optimize images before upload
const optimizeImages = (options = {}) => {
  const defaultOptions = {
    quality: 'auto',
    fetch_format: 'auto',
    ...options
  };
  
  return processCloudinaryUpload(defaultOptions);
};

// Specific upload middleware for different routes
const uploadMiddleware = {
  // Product image upload
  productImages: [
    uploadConfig.productImages,
    handleUploadError,
    optimizeImages({
      transformation: [
        { width: 1000, height: 1000, crop: 'limit' },
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    })
  ],
  
  // Store logo upload
  storeLogo: [
    uploadConfig.storeLogo,
    handleUploadError,
    optimizeImages({
      transformation: [
        { width: 500, height: 500, crop: 'limit' },
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    })
  ],
  
  // User avatar upload
  userAvatar: [
    uploadConfig.userAvatar,
    handleUploadError,
    optimizeImages({
      transformation: [
        { width: 300, height: 300, crop: 'fill', gravity: 'face' },
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    })
  ],
  
  // Category image upload
  categoryImage: [
    uploadConfig.categoryImage,
    handleUploadError,
    optimizeImages({
      transformation: [
        { width: 800, height: 400, crop: 'fill' },
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    })
  ],
  
  // General single image upload
  singleImage: [
    uploadConfig.single('image'),
    handleUploadError,
    optimizeImages()
  ],
  
  // General multiple images upload
  multipleImages: [
    uploadConfig.multiple('images'),
    handleUploadError,
    optimizeImages()
  ]
};

// Cleanup middleware - removes uploaded files from Cloudinary if request fails
const cleanupOnError = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Check if response indicates an error
    const isError = res.statusCode >= 400;
    
    if (isError) {
      // Cleanup uploaded images
      const cleanupPromises = [];
      
      if (req.uploadedImage) {
        cleanupPromises.push(imageHelpers.deleteImage(req.uploadedImage.publicId));
      }
      
      if (req.uploadedImages) {
        req.uploadedImages.forEach(img => {
          cleanupPromises.push(imageHelpers.deleteImage(img.publicId));
        });
      }
      
      if (req.uploadedFiles) {
        Object.values(req.uploadedFiles).forEach(fileOrFiles => {
          if (Array.isArray(fileOrFiles)) {
            fileOrFiles.forEach(img => {
              cleanupPromises.push(imageHelpers.deleteImage(img.publicId));
            });
          } else if (fileOrFiles && fileOrFiles.publicId) {
            cleanupPromises.push(imageHelpers.deleteImage(fileOrFiles.publicId));
          }
        });
      }
      
      // Execute cleanup (don't wait for completion)
      if (cleanupPromises.length > 0) {
        Promise.all(cleanupPromises).catch(error => {
          console.error('Error cleaning up uploaded images:', error);
        });
      }
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

module.exports = {
  uploadConfig,
  uploadMiddleware,
  handleUploadError,
  processCloudinaryUpload,
  optimizeImages,
  validateImageDimensions,
  cleanupOnError,
  
  // Direct exports for easy use
  single: uploadConfig.single,
  multiple: uploadConfig.multiple,
  fields: uploadConfig.fields
};