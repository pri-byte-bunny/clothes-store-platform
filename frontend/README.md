// README.md
# LocalClothes Frontend

A React-based frontend for the LocalClothes platform - connecting local clothing vendors with customers.

## Features

- 🔐 **Authentication System** - Login/Register for buyers and sellers
- 📍 **Location-based Discovery** - Find stores near you using GPS
- 🛒 **Shopping Cart** - Add items and manage orders
- 💬 **Bargaining System** - Negotiate prices with sellers
- 📱 **Responsive Design** - Mobile-first approach
- 🔔 **Real-time Notifications** - Socket.io integration
- 💳 **Payment Integration** - Multiple payment methods
- 🆘 **Support System** - Help desk and tickets

## Tech Stack

- **React 18** - Frontend framework
- **React Router** - Navigation
- **Tailwind CSS** - Styling
- **Axios** - API calls
- **Socket.io Client** - Real-time features
- **React Hot Toast** - Notifications
- **Lucide React** - Icons

## Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd clothes-store-frontend
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start development server**
```bash
npm start
```

The app will be available at `http://localhost:3000`

## Environment Variables

Create a `.env` file in the root directory:

```env
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
REACT_APP_RAZORPAY_KEY_ID=your-razorpay-key-id
REACT_APP_SOCKET_URL=http://localhost:3001
```

## Project Structure

```
src/
├── components/           # Reusable components
│   ├── auth/            # Authentication components
│   ├── common/          # Common UI components
│   ├── product/         # Product-related components
│   ├── store/           # Store-related components
│   └── ui/              # Basic UI components
├── context/             # React context providers
├── hooks/               # Custom React hooks
├── pages/               # Main page components
├── services/            # API service functions
├── styles/              # CSS and styling files
└── utils/               # Utility functions
```

## Available Scripts

- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App

## Key Features Implementation

### Authentication Flow
- Login/Register forms with validation
- JWT token management
- Role-based routing (buyer/seller)
- Protected routes

### Location Services
- GPS location detection
- Google Maps integration
- Address geocoding
- Distance calculations

### Shopping Cart
- Local storage persistence
- Real-time updates
- Multi-store support
- Quantity management

### Real-time Features
- Socket.io connection
- Live notifications
- Order status updates
- Bargain messaging

## Contributing

1. Create a feature branch
2. Make your changes
3. Add tests if applicable
4. Submit a pull request

## License

This project is licensed under the MIT License.