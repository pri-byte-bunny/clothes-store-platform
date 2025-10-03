// src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { LocationProvider } from './context/LocationContext';
import { SocketProvider } from './context/SocketContext';

// Pages
import HomePage from './pages/HomePage';
import StorePage from './pages/StorePage';
import ProductPage from './pages/ProductPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrdersPage from './pages/OrdersPage';
import ProfilePage from './pages/ProfilePage';
import SupportPage from './pages/SupportPage';
import SellerDashboard from './pages/SellerDashboard';
import NotFoundPage from './pages/NotFoundPage';

// Auth Components
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Common Components
import Header from './components/common/Header';
import BottomNav from './components/common/BottomNav';
import Loading from './components/common/Loading';
import ErrorMessage from './components/common/ErrorMessage';

// Hooks
import { useAuth } from './hooks/useAuth';

// Styles
import './styles/index.css';
import './styles/tailwind.css';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Initialize app
    const initializeApp = async () => {
      try {
        // Check for existing auth token
        const token = localStorage.getItem('token');
        if (token) {
          // Validate token with backend
          // This would be handled by AuthContext
        }
        setIsLoading(false);
      } catch (err) {
        setError('Failed to initialize application');
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loading size="large" message="Loading LocalClothes..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <ErrorMessage message={error} />
      </div>
    );
  }

  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <LocationProvider>
            <SocketProvider>
              <div className="App min-h-screen bg-gray-50">
                <AppContent />
              </div>
            </SocketProvider>
          </LocationProvider>
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}

function AppContent() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <AuthFlow />;
  }

  return (
    <>
      <Header />
      <main className="pb-16"> {/* Space for bottom navigation */}
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/store/:storeId" element={<StorePage />} />
          <Route path="/product/:productId" element={<ProductPage />} />
          
          {/* Protected Routes */}
          <Route path="/cart" element={
            <ProtectedRoute>
              <CartPage />
            </ProtectedRoute>
          } />
          <Route path="/checkout" element={
            <ProtectedRoute>
              <CheckoutPage />
            </ProtectedRoute>
          } />
          <Route path="/orders" element={
            <ProtectedRoute>
              <OrdersPage />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />
          <Route path="/support" element={
            <ProtectedRoute>
              <SupportPage />
            </ProtectedRoute>
          } />
          
          {/* Seller Only Routes */}
          <Route path="/seller/dashboard" element={
            <ProtectedRoute requireRole="seller">
              <SellerDashboard />
            </ProtectedRoute>
          } />
          
          {/* Fallback Routes */}
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </>
  );
}

function AuthFlow() {
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'

  return (
    <div className="min-h-screen bg-gray-50">
      {authMode === 'login' ? (
        <LoginForm 
          onSwitchToRegister={() => setAuthMode('register')}
        />
      ) : (
        <RegisterForm 
          onSwitchToLogin={() => setAuthMode('login')}
        />
      )}
    </div>
  );
}

export default App;