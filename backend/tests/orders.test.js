const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const Store = require('../models/Store');
const Product = require('../models/Product');
const Order = require('../models/Order');
const database = require('../config/database');

describe('Order Endpoints', () => {
  let sellerToken, buyerToken;
  let sellerId, buyerId;
  let storeId, productId;

  beforeAll(async () => {
    await database.connect();
  });

  afterAll(async () => {
    await Order.deleteMany({});
    await Product.deleteMany({});
    await Store.deleteMany({});
    await User.deleteMany({});
    await database.disconnect();
  });

  beforeEach(async () => {
    // Clean up
    await Order.deleteMany({});
    await Product.deleteMany({});
    await Store.deleteMany({});
    await User.deleteMany({});

    // Create seller and buyer
    const sellerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test Seller',
        email: 'seller@example.com',
        password: 'password123',
        phone: '9999999999',
        role: 'seller',
        address: { city: 'Test City' }
      });

    sellerToken = sellerResponse.body.token;
    sellerId = sellerResponse.body.user.id;

    const buyerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test Buyer',
        email: 'buyer@example.com',
        password: 'password123',
        phone: '9999999998',
        role: 'buyer',
        address: { city: 'Test City' }
      });

    buyerToken = buyerResponse.body.token;
    buyerId = buyerResponse.body.user.id;

    // Create store
    const storeResponse = await request(app)
      .post('/api/stores')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        storeName: 'Test Store',
        address: {
          street: '123 Test Street',
          city: 'Test City',
          state: 'Test State',
          pincode: '123456',
          coordinates: { latitude: 23.3441, longitude: 85.3096 }
        }
      });

    storeId = storeResponse.body.store._id;

    // Create product
    const productResponse = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        name: 'Test Product',
        description: 'Test product',
        category: 'T-Shirts',
        price: 599,
        stock: 10,
        storeId
      });

    productId = productResponse.body.product._id;
  });

  describe('POST /api/orders', () => {
    const validOrderData = {
      products: [{
        productId: null, // Will be set in test
        quantity: 2,
        size: 'M',
        color: 'Red'
      }],
      shippingAddress: {
        name: 'Test User',
        phone: '9999999999',
        street: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        pincode: '123456'
      },
      paymentMethod: 'cod'
    };

    it('should create order with valid data (buyer)', async () => {
      const orderData = {
        ...validOrderData,
        products: [{
          ...validOrderData.products[0],
          productId
        }]
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(orderData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.order.buyerId).toBe(buyerId);
      expect(response.body.order.products).toHaveLength(1);
    });

    it('should not create order as seller', async () => {
      const orderData = {
        ...validOrderData,
        products: [{
          ...validOrderData.products[0],
          productId
        }]
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send(orderData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should not create order with insufficient stock', async () => {
      const orderData = {
        ...validOrderData,
        products: [{
          ...validOrderData.products[0],
          productId,
          quantity: 20 // More than available stock
        }]
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(orderData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('stock');
    });
  });

  describe('GET /api/orders/my', () => {
    let orderId;

    beforeEach(async () => {
      // Create a test order
      const orderResponse = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          products: [{ productId, quantity: 1 }],
          shippingAddress: {
            name: 'Test User',
            phone: '9999999999',
            street: '123 Test Street',
            city: 'Test City',
            state: 'Test State',
            pincode: '123456'
          },
          paymentMethod: 'cod'
        });

      orderId = orderResponse.body.order._id;
    });

    it('should get buyer orders', async () => {
      const response = await request(app)
        .get('/api/orders/my')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].buyerId).toBe(buyerId);
    });

    it('should get seller orders', async () => {
      const response = await request(app)
        .get('/api/orders/my')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].sellerId).toBe(sellerId);
    });
  });
});