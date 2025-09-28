const Support = require('../models/Support');
const User = require('../models/User');
const nodemailer = require('nodemailer');

// Configure email transporter
const transporter = nodemailer.createTransporter({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const supportController = {
  // Create a new support ticket
  createTicket: async (req, res) => {
    try {
      const {
        subject,
        message,
        category,
        priority = 'medium',
        orderReference
      } = req.body;

      const ticket = new Support({
        user: req.user.id,
        subject,
        message,
        category,
        priority,
        orderReference,
        messages: [{
          sender: req.user.id,
          message,
          timestamp: new Date()
        }]
      });

      await ticket.save();
      await ticket.populate('user', 'name email');

      // Send email notification to support team
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: process.env.SUPPORT_EMAIL,
          subject: `New Support Ticket: ${subject}`,
          html: `
            <h3>New Support Ticket Created</h3>
            <p><strong>Ticket ID:</strong> ${ticket.ticketId}</p>
            <p><strong>User:</strong> ${ticket.user.name} (${ticket.user.email})</p>
            <p><strong>Category:</strong> ${category}</p>
            <p><strong>Priority:</strong> ${priority}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Message:</strong></p>
            <p>${message}</p>
            ${orderReference ? `<p><strong>Order Reference:</strong> ${orderReference}</p>` : ''}
          `
        });
      } catch (emailError) {
        console.error('Email notification error:', emailError);
      }

      res.status(201).json({
        success: true,
        message: 'Support ticket created successfully',
        ticket
      });

    } catch (error) {
      console.error('Create ticket error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create support ticket',
        error: error.message
      });
    }
  },

  // Get all tickets for a user
  getUserTickets: async (req, res) => {
    try {
      const { page = 1, limit = 10, status, category } = req.query;

      const filter = { user: req.user.id };
      if (status) filter.status = status;
      if (category) filter.category = category;

      const tickets = await Support.find(filter)
        .populate('user', 'name email')
        .populate('assignedTo', 'name email role')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .select('-messages'); // Exclude messages for list view

      const total = await Support.countDocuments(filter);

      res.json({
        success: true,
        tickets,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      });

    } catch (error) {
      console.error('Get user tickets error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch tickets',
        error: error.message
      });
    }
  },

  // Get ticket by ID
  getTicketById: async (req, res) => {
    try {
      const { id } = req.params;

      const ticket = await Support.findById(id)
        .populate('user', 'name email avatar')
        .populate('assignedTo', 'name email role')
        .populate('messages.sender', 'name email role avatar');

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found'
        });
      }

      // Check if user owns the ticket or is admin/support staff
      if (ticket.user._id.toString() !== req.user.id && 
          !['admin', 'support'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      res.json({
        success: true,
        ticket
      });

    } catch (error) {
      console.error('Get ticket error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch ticket',
        error: error.message
      });
    }
  },

  // Add message to ticket
  addMessage: async (req, res) => {
    try {
      const { id } = req.params;
      const { message } = req.body;

      const ticket = await Support.findById(id);
      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found'
        });
      }

      // Check if user can add message to this ticket
      if (ticket.user.toString() !== req.user.id && 
          !['admin', 'support'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Add new message
      ticket.messages.push({
        sender: req.user.id,
        message,
        timestamp: new Date()
      });

      // Update ticket status if it was closed and user is replying
      if (ticket.status === 'closed' && ticket.user.toString() === req.user.id) {
        ticket.status = 'open';
      }

      ticket.lastActivity = new Date();
      await ticket.save();

      // Populate the new message
      await ticket.populate('messages.sender', 'name email role avatar');
      const newMessage = ticket.messages[ticket.messages.length - 1];

      // Send email notification
      try {
        const isUserMessage = ticket.user.toString() === req.user.id;
        const emailTo = isUserMessage ? process.env.SUPPORT_EMAIL : ticket.user.email;
        
        if (emailTo) {
          await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: emailTo,
            subject: `New Message in Ticket: ${ticket.subject}`,
            html: `
              <h3>New Message in Support Ticket</h3>
              <p><strong>Ticket ID:</strong> ${ticket.ticketId}</p>
              <p><strong>From:</strong> ${newMessage.sender.name}</p>
              <p><strong>Message:</strong></p>
              <p>${message}</p>
              <p><a href="${process.env.CLIENT_URL}/support/tickets/${ticket._id}">View Ticket</a></p>
            `
          });
        }
      } catch (emailError) {
        console.error('Email notification error:', emailError);
      }

      res.json({
        success: true,
        message: 'Message added successfully',
        newMessage
      });

    } catch (error) {
      console.error('Add message error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add message',
        error: error.message
      });
    }
  },

  // Update ticket status (admin/support only)
  updateTicketStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status, assignedTo, priority } = req.body;

      // Check if user has permission
      if (!['admin', 'support'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const ticket = await Support.findById(id);
      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found'
        });
      }

      // Update fields
      if (status) ticket.status = status;
      if (assignedTo) ticket.assignedTo = assignedTo;
      if (priority) ticket.priority = priority;

      if (status === 'closed') {
        ticket.closedAt = new Date();
      }

      ticket.lastActivity = new Date();
      await ticket.save();

      await ticket.populate(['user', 'assignedTo'], 'name email role');

      // Send email notification to user about status change
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: ticket.user.email,
          subject: `Ticket Status Updated: ${ticket.subject}`,
          html: `
            <h3>Your Support Ticket Status Has Been Updated</h3>
            <p><strong>Ticket ID:</strong> ${ticket.ticketId}</p>
            <p><strong>Subject:</strong> ${ticket.subject}</p>
            <p><strong>New Status:</strong> ${status}</p>
            ${assignedTo ? `<p><strong>Assigned To:</strong> ${ticket.assignedTo.name}</p>` : ''}
            <p><a href="${process.env.CLIENT_URL}/support/tickets/${ticket._id}">View Ticket</a></p>
          `
        });
      } catch (emailError) {
        console.error('Email notification error:', emailError);
      }

      res.json({
        success: true,
        message: 'Ticket updated successfully',
        ticket
      });

    } catch (error) {
      console.error('Update ticket error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update ticket',
        error: error.message
      });
    }
  },

  // Get all tickets (admin/support only)
  getAllTickets: async (req, res) => {
    try {
      // Check if user has permission
      if (!['admin', 'support'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const {
        page = 1,
        limit = 20,
        status,
        category,
        priority,
        assignedTo,
        search
      } = req.query;

      const filter = {};
      if (status) filter.status = status;
      if (category) filter.category = category;
      if (priority) filter.priority = priority;
      if (assignedTo) filter.assignedTo = assignedTo;

      if (search) {
        filter.$or = [
          { subject: { $regex: search, $options: 'i' } },
          { ticketId: { $regex: search, $options: 'i' } }
        ];
      }

      const tickets = await Support.find(filter)
        .populate('user', 'name email')
        .populate('assignedTo', 'name email role')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .select('-messages');

      const total = await Support.countDocuments(filter);

      // Get statistics
      const stats = await Support.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      res.json({
        success: true,
        tickets,
        statistics: stats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      });

    } catch (error) {
      console.error('Get all tickets error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch tickets',
        error: error.message
      });
    }
  },

  // Get support statistics (admin only)
  getSupportStats: async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const today = new Date();
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [
        totalTickets,
        openTickets,
        closedTickets,
        todayTickets,
        weekTickets,
        monthTickets,
        categoryStats,
        priorityStats
      ] = await Promise.all([
        Support.countDocuments(),
        Support.countDocuments({ status: 'open' }),
        Support.countDocuments({ status: 'closed' }),
        Support.countDocuments({ createdAt: { $gte: today } }),
        Support.countDocuments({ createdAt: { $gte: lastWeek } }),
        Support.countDocuments({ createdAt: { $gte: lastMonth } }),
        Support.aggregate([
          { $group: { _id: '$category', count: { $sum: 1 } } }
        ]),
        Support.aggregate([
          { $group: { _id: '$priority', count: { $sum: 1 } } }
        ])
      ]);

      res.json({
        success: true,
        stats: {
          total: totalTickets,
          open: openTickets,
          closed: closedTickets,
          today: todayTickets,
          thisWeek: weekTickets,
          thisMonth: monthTickets,
          byCategory: categoryStats.reduce((acc, stat) => {
            acc[stat._id] = stat.count;
            return acc;
          }, {}),
          byPriority: priorityStats.reduce((acc, stat) => {
            acc[stat._id] = stat.count;
            return acc;
          }, {})
        }
      });

    } catch (error) {
      console.error('Get support stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch support statistics',
        error: error.message
      });
    }
  },

  // Get FAQ items
  getFAQ: async (req, res) => {
    try {
      const { category } = req.query;

      // This could be stored in database or a static array
      const faqItems = [
        {
          category: 'general',
          question: 'How do I create an account?',
          answer: 'Click on the "Sign Up" button and fill in your details. You will receive a verification email to activate your account.'
        },
        {
          category: 'orders',
          question: 'How can I track my order?',
          answer: 'You can track your order by logging into your account and visiting the "My Orders" section. You will also receive tracking updates via email.'
        },
        {
          category: 'payments',
          question: 'What payment methods do you accept?',
          answer: 'We accept all major credit cards, debit cards, and digital wallets through our secure payment gateways.'
        },
        {
          category: 'returns',
          question: 'What is your return policy?',
          answer: 'We offer a 30-day return policy for unused items in original condition. Please contact support to initiate a return.'
        },
        {
          category: 'stores',
          question: 'How do I create a store?',
          answer: 'After creating an account, go to your dashboard and click "Create Store". Fill in your store details and upload required documents for verification.'
        }
      ];

      const filteredFAQ = category 
        ? faqItems.filter(item => item.category === category)
        : faqItems;

      res.json({
        success: true,
        faq: filteredFAQ,
        categories: ['general', 'orders', 'payments', 'returns', 'stores']
      });

    } catch (error) {
      console.error('Get FAQ error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch FAQ',
        error: error.message
      });
    }
  },

  // Submit contact form
  submitContactForm: async (req, res) => {
    try {
      const { name, email, subject, message, phone } = req.body;

      // Send email to support team
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: process.env.SUPPORT_EMAIL,
        replyTo: email,
        subject: `Contact Form: ${subject}`,
        html: `
          <h3>New Contact Form Submission</h3>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong></p>
          <p>${message}</p>
        `
      });

      // Send confirmation email to user
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'Thank you for contacting us',
        html: `
          <h3>Thank you for contacting us!</h3>
          <p>Dear ${name},</p>
          <p>We have received your message and will get back to you within 24 hours.</p>
          <p><strong>Your message:</strong></p>
          <p>${message}</p>
          <p>Best regards,<br>Support Team</p>
        `
      });

      res.json({
        success: true,
        message: 'Thank you for your message. We will get back to you soon!'
      });

    } catch (error) {
      console.error('Contact form error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send message. Please try again.',
        error: error.message
      });
    }
  }
};

module.exports = supportController;