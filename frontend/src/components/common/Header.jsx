// src/components/common/Header.jsx
import React, { useState } from 'react';
import { Search, ShoppingCart, User, Bell, Menu, MapPin } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import Dropdown, { DropdownItem, DropdownDivider } from '../ui/Dropdown';
import Button from '../ui/Button';

const Header = () => {
  const navigate = useNavigate();
  const { user, logout, isSeller } = useAuth();
  const { items } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const cartItemCount = items.reduce((total, item) => total + item.quantity, 0);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">LC</span>
              </div>
              <span className="text-xl font-bold text-gray-900 hidden sm:block">
                LocalClothes
              </span>
            </Link>
          </div>

          {/* Search Bar - Hidden on mobile */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-8">
            <form onSubmit={handleSearch} className="w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search for clothes, stores..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </form>
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            {/* Location - Hidden on mobile */}
            <div className="hidden lg:flex items-center text-sm text-gray-600">
              <MapPin className="w-4 h-4 mr-1" />
              <span>Ranchi, JH</span>
            </div>

            {/* Notifications */}
            <button className="relative p-2 text-gray-600 hover:text-blue-600 transition-colors">
              <Bell className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                3
              </span>
            </button>

            {/* Shopping Cart */}
            <Link
              to="/cart"
              className="relative p-2 text-gray-600 hover:text-blue-600 transition-colors"
            >
              <ShoppingCart className="w-6 h-6" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </Link>

            {/* User Menu */}
            <Dropdown
              trigger={
                <button className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                  <span className="hidden sm:block text-sm font-medium">
                    {user?.name}
                  </span>
                </button>
              }
              align="right"
            >
              <div className="py-1">
                <DropdownItem onClick={() => navigate('/profile')}>
                  My Profile
                </DropdownItem>
                <DropdownItem onClick={() => navigate('/orders')}>
                  My Orders
                </DropdownItem>
                {isSeller() && (
                  <>
                    <DropdownDivider />
                    <DropdownItem onClick={() => navigate('/seller/dashboard')}>
                      Seller Dashboard
                    </DropdownItem>
                  </>
                )}
                <DropdownDivider />
                <DropdownItem onClick={() => navigate('/support')}>
                  Help & Support
                </DropdownItem>
                <DropdownItem onClick={handleLogout}>
                  Sign Out
                </DropdownItem>
              </div>
            </Dropdown>

            {/* Mobile menu button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 text-gray-600 hover:text-blue-600"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Mobile Search - Only visible on mobile */}
        <div className="md:hidden pb-4">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search clothes, stores..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </form>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="space-y-2">
              <Link
                to="/profile"
                className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                onClick={() => setShowMobileMenu(false)}
              >
                My Profile
              </Link>
              <Link
                to="/orders"
                className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                onClick={() => setShowMobileMenu(false)}
              >
                My Orders
              </Link>
              {isSeller() && (
                <Link
                  to="/seller/dashboard"
                  className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Seller Dashboard
                </Link>
              )}
              <Link
                to="/support"
                className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                onClick={() => setShowMobileMenu(false)}
              >
                Help & Support
              </Link>
              <button
                onClick={handleLogout}
                className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;