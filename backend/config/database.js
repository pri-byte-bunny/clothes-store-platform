const mongoose = require('mongoose');
const config = require('./config');

class Database {
  constructor() {
    this.connection = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      // Prevent multiple connections
      if (this.isConnected) {
        console.log('Database already connected');
        return this.connection;
      }

      // Set mongoose options
      mongoose.set('strictQuery', false);

      // Connect to MongoDB
      this.connection = await mongoose.connect(config.database.uri, config.database.options);

      this.isConnected = true;
      console.log(`✅ MongoDB Connected: ${this.connection.connection.host}`);

      // Setup connection event listeners
      this.setupEventListeners();

      // Create indexes
      await this.createIndexes();

      return this.connection;
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      process.exit(1);
    }
  }

  setupEventListeners() {
    const db = mongoose.connection;

    db.on('error', (error) => {
      console.error('MongoDB connection error:', error);
      this.isConnected = false;
    });

    db.on('disconnected', () => {
      console.log('MongoDB disconnected');
      this.isConnected = false;
    });

    db.on('reconnected', () => {
      console.log('MongoDB reconnected');
      this.isConnected = true;
    });

    db.on('connected', () => {
      console.log('MongoDB connected');
      this.isConnected = true;
    });

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      await this.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.disconnect();
      process.exit(0);
    });
  }

  async createIndexes() {
    try {
      const User = require('../models/User');
      const Store = require('../models/Store');
      const Product = require('../models/Product');
      const Order = require('../models/Order');

      // Create geospatial indexes
      await Store.collection.createIndex({ 'address.coordinates': '2dsphere' });
      await User.collection.createIndex({ 'address.coordinates': '2dsphere' });

      // Create text search indexes
      await Store.collection.createIndex({ 
        storeName: 'text', 
        description: 'text', 
        tags: 'text' 
      }, { weights: { storeName: 10, description: 5, tags: 1 } });

      await Product.collection.createIndex({ 
        name: 'text', 
        description: 'text', 
        tags: 'text',
        brand: 'text'
      }, { weights: { name: 10, brand: 8, description: 5, tags: 1 } });

      // Create compound indexes for better query performance
      await User.collection.createIndex({ email: 1, isActive: 1 });
      await Store.collection.createIndex({ sellerId: 1, isActive: 1 });
      await Product.collection.createIndex({ storeId: 1, isActive: 1 });
      await Product.collection.createIndex({ category: 1, price: 1 });
      await Order.collection.createIndex({ buyerId: 1, createdAt: -1 });
      await Order.collection.createIndex({ sellerId: 1, orderStatus: 1 });

      console.log('✅ Database indexes created successfully');
    } catch (error) {
      console.error('❌ Error creating indexes:', error);
    }
  }

  async disconnect() {
    try {
      if (this.isConnected) {
        await mongoose.connection.close();
        this.isConnected = false;
        console.log('🔌 Database connection closed');
      }
    } catch (error) {
      console.error('Error closing database connection:', error);
    }
  }

  async dropDatabase() {
    try {
      if (config.NODE_ENV === 'test') {
        await mongoose.connection.dropDatabase();
        console.log('🗑️ Test database dropped');
      } else {
        throw new Error('Database drop only allowed in test environment');
      }
    } catch (error) {
      console.error('Error dropping database:', error);
      throw error;
    }
  }

  getConnection() {
    return this.connection;
  }

  isConnectedToDatabase() {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  // Health check
  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { status: 'disconnected', message: 'Database not connected' };
      }

      // Test database connection
      await mongoose.connection.db.admin().ping();
      
      return {
        status: 'connected',
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name,
        readyState: mongoose.connection.readyState,
        collections: Object.keys(mongoose.connection.collections).length
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        error: error
      };
    }
  }

  // Get database statistics
  async getStats() {
    try {
      if (!this.isConnected) {
        throw new Error('Database not connected');
      }

      const stats = await mongoose.connection.db.stats();
      return {
        collections: stats.collections,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        indexSize: stats.indexSize,
        objects: stats.objects
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      throw error;
    }
  }
}

// Create singleton instance
const database = new Database();

module.exports = database;