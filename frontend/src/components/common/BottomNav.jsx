// src/components/common/BottomNav.jsx
import React from 'react';
import { Home, Search, ShoppingCart, MessageSquare, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';

const BottomNav = () => {
  const location = useLocation();
  const { items } = useCart();
  const { isSeller } = useAuth();
  
  const cartItemCount = items.reduce((total, item) => total + item.quantity, 0);

  const navItems = [
    {
      path: '/',
      icon: Home,
      label: 'Home',
      isActive: location.pathname === '/'
    },
    {
      path: '/search',
      icon: Search,
      label: 'Search',
      isActive: location.pathname.startsWith('/search')
    },
    {
      path: '/cart',
      icon: ShoppingCart,
      label: 'Cart',
      badge: cartItemCount > 0 ? cartItemCount : null,
      isActive: location.pathname === '/cart'
    },
    {
      path: '/support',
      icon: MessageSquare,
      label: 'Support',
      isActive: location.pathname === '/support'
    },
    {
      path: isSeller() ? '/seller/dashboard' : '/profile',
      icon: User,
      label: isSeller() ? 'Dashboard' : 'Profile',
      isActive: location.pathname === '/profile' || location.pathname.startsWith('/seller')
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-30">
      <div className="flex justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center space-y-1 py-1 px-3 rounded-lg transition-colors ${
                item.isActive
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="relative">
                <Icon className="w-6 h-6" />
                {item.badge && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;