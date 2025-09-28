const cron = require('node-cron');
const { sendEmail } = require('../services/emailService');
const Order = require('../models/Order');
const User = require('../models/User');
const Support = require('../models/Support');
const Notification = require('../models/Notification');

class EmailJob {
  constructor() {
    this.isRunning = false;
  }

  // Start all email jobs
  start() {
    console.log('📧 Starting email jobs...');
    
    // Send daily order summary to sellers
    this.scheduleOrderSummary();
    
    // Send weekly analytics to sellers
    this.scheduleWeeklyAnalytics();
    
    // Send abandoned cart reminders
    this.scheduleAbandonedCartReminders();
    
    // Send pending notification emails
    this.schedulePendingNotifications();
    
    // Auto-close old support tickets
    this.scheduleTicketAutoClose();
    
    console.log('📧 Email jobs scheduled successfully');
  }

  // Daily order summary for sellers (8 AM every day)
  scheduleOrderSummary() {
    cron.schedule('0 8 * * *', async () => {
      try {
        console.log('📊 Sending daily order summary...');
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get all sellers with orders
        const sellers = await User.find({ role: 'seller', isActive: true });
        
        for (const seller of sellers) {
          const orders = await Order.find({
            sellerId: seller._id,
            createdAt: { $gte: yesterday, $lt: today }
          }).populate('buyerId', 'name');

          if (orders.length > 0) {
            const totalRevenue = orders.reduce((sum, order) => sum + order.sellerAmount, 0);
            const ordersByStatus = orders.reduce((acc, order) => {
              acc[order.orderStatus] = (acc[order.orderStatus] || 0) + 1;
              return acc;
            }, {});

            const emailData = {
              sellerName: seller.name,
              date: yesterday.toDateString(),
              totalOrders: orders.length,
              totalRevenue: totalRevenue,
              ordersByStatus: ordersByStatus,
              orders: orders.slice(0, 10) // Show only first 10 orders
            };

            await this.sendOrderSummaryEmail(seller.email, emailData);
          }
        }
        
        console.log('✅ Daily order summary sent');
      } catch (error) {
        console.error('❌ Error sending daily order summary:', error);
      }
    });
  }

  // Weekly analytics for sellers (Monday 9 AM)
  scheduleWeeklyAnalytics() {
    cron.schedule('0 9 * * 1', async () => {
      try {
        console.log('📈 Sending weekly analytics...');
        
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        
        const sellers = await User.find({ role: 'seller', isActive: true });
        
        for (const seller of sellers) {
          const analytics = await this.calculateWeeklyAnalytics(seller._id, lastWeek);
          await this.sendWeeklyAnalyticsEmail(seller.email, analytics);
        }
        
        console.log('✅ Weekly analytics sent');
      } catch (error) {
        console.error('❌ Error sending weekly analytics:', error);
      }
    });
  }

  // Abandoned cart reminders (Every 6 hours)
  scheduleAbandonedCartReminders() {
    cron.schedule('0 */6 * * *', async () => {
      try {
        console.log('🛒 Checking for abandoned carts...');
        
        // This would require implementing cart tracking
        // For now, just log that the job ran
        console.log('📧 Abandoned cart reminder job completed');
      } catch (error) {
        console.error('❌ Error checking abandoned carts:', error);
      }
    });
  }

  // Send pending email notifications (Every 5 minutes)
  schedulePendingNotifications() {
    cron.schedule('*/5 * * * *', async () => {
      try {
        // Find notifications that need to be sent via email
        const pendingNotifications = await Notification.find({
          channels: 'email',
          'sentChannels.channel': { $ne: 'email' },
          createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour only
        }).populate('userId', 'name email preferences').limit(50);

        for (const notification of pendingNotifications) {
          if (notification.userId.preferences?.notifications?.email !== false) {
            await this.sendNotificationEmail(notification);
            
            // Mark as sent
            notification.sentChannels.push({
              channel: 'email',
              sentAt: new Date(),
              status: 'sent'
            });
            await notification.save();
          }
        }

        if (pendingNotifications.length > 0) {
          console.log(`📧 Sent ${pendingNotifications.length} notification emails`);
        }
      } catch (error) {
        console.error('❌ Error sending notification emails:', error);
      }
    });
  }

  // Auto-close old support tickets (Daily at 2 AM)
  scheduleTicketAutoClose() {
    cron.schedule('0 2 * * *', async () => {
      try {
        console.log('🎫 Auto-closing old support tickets...');
        
        const autoCloseDate = new Date();
        autoCloseDate.setHours(autoCloseDate.getHours() - 72); // 72 hours ago

        const result = await Support.updateMany(
          {
            status: 'resolved',
            resolvedAt: { $lte: autoCloseDate }
          },
          {
            $set: {
              status: 'closed',
              closedAt: new Date()
            },
            $push: {
              internalNotes: {
                note: 'Ticket auto-closed after 72 hours',
                addedBy: null,
                timestamp: new Date()
              }
            }
          }
        );

        console.log(`✅ Auto-closed ${result.modifiedCount} support tickets`);
      } catch (error) {
        console.error('❌ Error auto-closing tickets:', error);
      }
    });
  }

  // Calculate weekly analytics for a seller
  async calculateWeeklyAnalytics(sellerId, startDate) {
    const endDate = new Date();
    
    const orders = await Order.find({
      sellerId,
      createdAt: { $gte: startDate, $lte: endDate }
    });

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.sellerAmount, 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    const statusDistribution = orders.reduce((acc, order) => {
      acc[order.orderStatus] = (acc[order.orderStatus] || 0) + 1;
      return acc;
    }, {});

    const topProducts = await this.getTopProducts(sellerId, startDate, endDate);

    return {
      period: `${startDate.toDateString()} - ${endDate.toDateString()}`,
      totalOrders,
      totalRevenue,
      avgOrderValue,
      statusDistribution,
      topProducts
    };
  }

  // Get top selling products for a seller
  async getTopProducts(sellerId, startDate, endDate) {
    const pipeline = [
      {
        $match: {
          sellerId,
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      { $unwind: '$products' },
      {
        $group: {
          _id: '$products.productId',
          name: { $first: '$products.name' },
          totalQuantity: { $sum: '$products.quantity' },
          totalRevenue: { $sum: { $multiply: ['$products.price', '$products.quantity'] } }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 }
    ];

    return await Order.aggregate(pipeline);
  }

  // Send order summary email
  async sendOrderSummaryEmail(email, data) {
    const subject = `Daily Order Summary - ${data.date}`;
    const html = `
      <h2>Daily Order Summary</h2>
      <p>Hello ${data.sellerName},</p>
      <p>Here's your order summary for ${data.date}:</p>
      
      <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
        <h3>Summary</h3>
        <p><strong>Total Orders:</strong> ${data.totalOrders}</p>
        <p><strong>Total Revenue:</strong> ₹${data.totalRevenue.toFixed(2)}</p>
      </div>

      <div style="background: #f9f9f9; padding: 20px; margin: 20px 0;">
        <h3>Orders by Status</h3>
        ${Object.entries(data.ordersByStatus).map(([status, count]) => 
          `<p><strong>${status}:</strong> ${count}</p>`
        ).join('')}
      </div>

      <p>Keep up the great work!</p>
      <p>Best regards,<br>LocalClothes Team</p>
    `;

    await sendEmail(email, subject, html);
  }

  // Send weekly analytics email
  async sendWeeklyAnalyticsEmail(email, analytics) {
    const subject = 'Weekly Analytics Report';
    const html = `
      <h2>Weekly Analytics Report</h2>
      <p>Here's your performance for ${analytics.period}:</p>
      
      <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
        <h3>Key Metrics</h3>
        <p><strong>Total Orders:</strong> ${analytics.totalOrders}</p>
        <p><strong>Total Revenue:</strong> ₹${analytics.totalRevenue.toFixed(2)}</p>
        <p><strong>Average Order Value:</strong> ₹${analytics.avgOrderValue.toFixed(2)}</p>
      </div>

      <div style="background: #f9f9f9; padding: 20px; margin: 20px 0;">
        <h3>Top Products</h3>
        ${analytics.topProducts.map(product => 
          `<p><strong>${product.name}:</strong> ${product.totalQuantity} sold</p>`
        ).join('')}
      </div>

      <p>Thank you for being part of LocalClothes!</p>
    `;

    await sendEmail(email, subject, html);
  }

  // Send notification email
  async sendNotificationEmail(notification) {
    const subject = notification.title;
    const html = `
      <h2>${notification.title}</h2>
      <p>Hello ${notification.userId.name},</p>
      <p>${notification.message}</p>
      
      ${notification.actionUrl ? `
        <p>
          <a href="${notification.actionUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            View Details
          </a>
        </p>
      ` : ''}
      
      <p>Best regards,<br>LocalClothes Team</p>
    `;

    await sendEmail(notification.userId.email, subject, html);
  }

  // Stop all jobs
  stop() {
    console.log('📧 Stopping email jobs...');
    // Note: node-cron doesn't provide a direct way to stop specific jobs
    // You would need to keep references to the scheduled jobs if you want to stop them
  }
}

module.exports = new EmailJob();