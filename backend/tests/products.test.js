const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const Store = require('../models/Store');
const Product = require('../models/Product');
const database = require('../config/database');

describe('Product Endpoints', () => {
  let sellerToken;
  let buyerToken;
  let storeId;
  let sellerId;

  beforeAll(async () => {
    await database.connect();
  });

  afterAll(async () => {
    await Product.deleteMany({});
    await Store.deleteMany({});
    await User.deleteMany({});
    await database.disconnect();
  });

  beforeEach(async () => {
    // Clean up
    await Product.deleteMany({});
    await Store.deleteMany({});
    await User.deleteMany({});

    // Create seller
    const sellerData = {
      name: 'Test Seller',
      email: 'seller@example.com',
      password: 'password123',
      phone: '9999999999',
      role: 'seller',
      address: { city: 'Test City' }
    };

    const sellerResponse = await request(app)
      .post('/api/auth/register')
      .send(sellerData);

    sellerToken = sellerResponse.body.token;
    sellerId = sellerResponse.body.user.id;

    // Create buyer
    const buyerData = {
      name: 'Test Buyer',
      email: 'buyer@example.com',
      password: 'password123',
      phone: '9999999998',
      role: 'buyer',
      address: { city: 'Test City' }
    };

    const buyerResponse = await request(app)
      .post('/api/auth/register')
      .send(buyerData);

    buyerToken = buyerResponse.body.token;

    // Create store
    const storeData = {
      storeName: 'Test Store',
      description: 'Test store description',
      address: {
        street: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        pincode: '123456',
        coordinates: {
          latitude: 23.3441,
          longitude: 85.3096
        }
      }
    };

    const storeResponse = await request(app)
      .post('/api/stores')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send(storeData);

    storeId = storeResponse.body.store._id;
  });

  describe('POST /api/products', () => {
    const validProductData = {
      name: 'Test Product',
      description: 'Test product description',
      category: 'T-Shirts',
      price: 599,
      discountPrice: 499,
      stock: 10,
      sizes: ['S', 'M', 'L'],
      colors: ['Red', 'Blue'],
      isBargainable: true
    };

    it('should create product with valid data (seller)', async () => {
      const productData = { ...validProductData, storeId };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send(productData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.product.name).toBe(productData.name);
      expect(response.body.product.sellerId).toBe(sellerId);
    });

    it('should not create product as buyer', async () => {
      const productData = { ...validProductData, storeId };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(productData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should not create product without authentication', async () => {
      const productData = { ...validProductData, storeId };

      const response = await request(app)
        .post('/api/products')
        .send(productData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should not create product with invalid store', async () => {
      const productData = { 
        ...validProductData, 
        storeId: new mongoose.Types.ObjectId() 
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send(productData);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/products/search', () => {
    beforeEach(async () => {
      // Create test products
      const products = [
        {
          name: 'Cotton T-Shirt',
          description: 'Comfortable cotton t-shirt',
          category: 'T-Shirts',
          price: 599,
          stock: 10,
          sellerId,
          storeId,
          isActive: true
        },
        {
          name: 'Denim Jeans',
          description: 'Stylish denim jeans',
          category: 'Jeans',
          price: 1299,
          stock: 5,
          sellerId,
          storeId,
          isActive: true
        }
      ];

      await Product.insertMany(products);
    });

    it('should search products by query', async () => {
      const response = await request(app)
        .get('/api/products/search?q=cotton');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toContain('Cotton');
    });

    it('should filter products by category', async () => {
      const response = await request(app)
        .get('/api/products/search?category=Jeans');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].category).toBe('Jeans');
    });

    it('should filter products by price range', async () => {
      const response = await request(app)
        .get('/api/products/search?minPrice=1000&maxPrice=1500');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].price).toBeGreaterThanOrEqual(1000);
      expect(response.body.data[0].price).toBeLessThanOrEqual(1500);
    });

    it('should return empty array for no matches', async () => {
      const response = await request(app)
        .get('/api/products/search?q=nonexistent');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });
  });
});
