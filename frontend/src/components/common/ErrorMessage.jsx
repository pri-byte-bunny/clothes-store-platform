// src/components/common/ErrorMessage.jsx
import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Button from '../ui/Button';

const ErrorMessage = ({ 
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
  showRetry = true,
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-red-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-4 max-w-md">{message}</p>
      {showRetry && onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          icon={RefreshCw}
        >
          Try Again
        </Button>
      )}
    </div>
  );
};

// Error Boundary Component
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <ErrorMessage
            title="Application Error"
            message="Something went wrong with the application. Please refresh the page."
            onRetry={() => window.location.reload()}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorMessage;