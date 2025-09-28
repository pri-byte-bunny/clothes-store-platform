const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer-storage-cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'clothes-store', // Folder name in Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [
      { width: 1000, height: 1000, crop: 'limit' }, // Limit size for optimization
      { quality: 'auto' }, // Auto quality
      { fetch_format: 'auto' } // Auto format selection
    ]
  }
});

// Create multer instance with Cloudinary storage
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10 // Maximum 10 files at once
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Helper functions for image operations
const imageHelpers = {
  // Upload single image
  uploadSingle: (fieldName) => upload.single(fieldName),
  
  // Upload multiple images
  uploadMultiple: (fieldName, maxCount = 10) => upload.array(fieldName, maxCount),
  
  // Upload multiple fields
  uploadFields: (fields) => upload.fields(fields),
  
  // Delete image from Cloudinary
  deleteImage: async (publicId) => {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
    } catch (error) {
      throw new Error(`Error deleting image: ${error.message}`);
    }
  },
  
  // Extract public ID from Cloudinary URL
  extractPublicId: (imageUrl) => {
    const matches = imageUrl.match(/\/([^\/]+)\.(jpg|jpeg|png|gif|webp)$/);
    return matches ? matches[1] : null;
  },
  
  // Generate optimized URL
  generateOptimizedUrl: (publicId, options = {}) => {
    const defaultOptions = {
      quality: 'auto',
      fetch_format: 'auto',
      width: options.width || 800,
      height: options.height || 600,
      crop: options.crop || 'fill'
    };
    
    return cloudinary.url(publicId, { ...defaultOptions, ...options });
  },
  
  // Generate thumbnail URL
  generateThumbnail: (publicId, size = 150) => {
    return cloudinary.url(publicId, {
      width: size,
      height: size,
      crop: 'fill',
      quality: 'auto',
      fetch_format: 'auto'
    });
  }
};

module.exports = {
  cloudinary,
  upload,
  imageHelpers
};