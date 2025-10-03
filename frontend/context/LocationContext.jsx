// src/context/LocationContext.jsx
import React, { createContext, useContext, useReducer } from 'react';
import { locationService } from '../services/locationService';

const LocationContext = createContext();

const locationReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_LOCATION':
      return { 
        ...state, 
        location: action.payload, 
        isLoading: false, 
        error: null 
      };
    case 'SET_ERROR':
      return { 
        ...state, 
        error: action.payload, 
        isLoading: false 
      };
    default:
      return state;
  }
};

const initialState = {
  location: null,
  isLoading: false,
  error: null
};

export const LocationProvider = ({ children }) => {
  const [state, dispatch] = useReducer(locationReducer, initialState);

  const value = {
    ...state,
    dispatch
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocationContext = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocationContext must be used within a LocationProvider');
  }
  return context;
};