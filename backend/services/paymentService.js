const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const createPaymentOrder = async (amount, currency = 'INR', receipt) => {
  try {
    const options = {
      amount: amount * 100, // Amount in paise
      currency,
      receipt,
      payment_capture: 1
    };
    
    const order = await razorpay.orders.create(options);
    return order;
  } catch (error) {
    console.error('Payment order creation failed:', error);
    throw error;
  }
};

const verifyPaymentSignature = (orderId, paymentId, signature) => {
  const crypto = require('crypto');
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(orderId + '|' + paymentId)
    .digest('hex');
    
  return generatedSignature === signature;
};

module.exports = { createPaymentOrder, verifyPaymentSignature };
