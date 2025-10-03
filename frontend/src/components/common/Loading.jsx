// src/components/common/Loading.jsx
import React from 'react';
import { Loader2 } from 'lucide-react';

const Loading = ({ 
  size = 'md', 
  message = 'Loading...', 
  className = '',
  showMessage = true 
}) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-2 ${className}`}>
      <Loader2 className={`${sizes[size]} animate-spin text-blue-600`} />
      {showMessage && message && (
        <p className={`text-gray-600 ${textSizes[size]}`}>{message}</p>
      )}
    </div>
  );
};

// Loading Skeleton component
export const LoadingSkeleton = ({ className = '', lines = 3 }) => {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`bg-gray-200 rounded h-4 mb-2 ${
            index === lines - 1 ? 'w-3/4' : 'w-full'
          }`}
        />
      ))}
    </div>
  );
};

// Page Loading component
export const PageLoading = ({ message = 'Loading page...' }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loading size="xl" message={message} />
    </div>
  );
};

export default Loading;