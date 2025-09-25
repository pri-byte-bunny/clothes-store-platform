const cron = require('node-cron');
const Transaction = require('../models/Transaction'); // Adjust path
const { sendNotificationToUser } = require('../utils/socketService');
const { sendEmail } = require('../utils/emailService');

// Run daily at midnight
const startSettlementJob = () => {
  cron.schedule('0 0 * * *', async () => {
    console.log('Starting daily settlement job...');
    
    try {
      const pendingTransactions = await Transaction.find({ 
        status: 'held',
        createdAt: { 
          $lte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
        }
      }).populate('sellerId orderId');
      
      for (const transaction of pendingTransactions) {
        // Mock bank transfer - replace with actual payment gateway API
        const transferResult = await mockBankTransfer(transaction);
        
        if (transferResult.success) {
          transaction.status = 'transferred';
          transaction.transferDate = new Date();
          transaction.transactionId = transferResult.transactionId;
          await transaction.save();
          
          // Notify seller
          sendNotificationToUser(transaction.sellerId._id, 'payment-settled', {
            amount: transaction.netAmount,
            transactionId: transaction.transactionId
          });
          
          // Send email notification
          await sendEmail(
            transaction.sellerId.email,
            'Payment Settled',
            `Your payment of ₹${transaction.netAmount} has been transferred to your account.`
          );
        }
      }
      
      console.log(`Settlement completed for ${pendingTransactions.length} transactions`);
    } catch (error) {
      console.error('Settlement job failed:', error);
    }
  });
};

const mockBankTransfer = async (transaction) => {
  // Mock implementation - replace with actual bank API
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        transactionId: 'TXN' + Date.now() + Math.random().toString(36).substr(2, 5)
      });
    }, 1000);
  });
};

module.exports = { startSettlementJob };

// Enhanced server.js additions
const http = require('http');
const { initSocket } = require('./utils/socketService');
const { startSettlementJob } = require('./jobs/settlementJob');

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Start settlement job
startSettlementJob();

// Update the listen call to use server instead of app
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Socket.io initialized');
  console.log('Settlement job scheduled');
});