// src/services/locationService.js
export const locationService = {
  // Get user's current location
  getCurrentLocation: () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              reject(new Error('Location access denied by user'));
              break;
            case error.POSITION_UNAVAILABLE:
              reject(new Error('Location information is unavailable'));
              break;
            case error.TIMEOUT:
              reject(new Error('Location request timed out'));
              break;
            default:
              reject(new Error('An unknown error occurred'));
              break;
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    });
  },

  // Geocode address to coordinates
  geocodeAddress: async (address) => {
    const API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    if (!API_KEY) {
      throw new Error('Google Maps API key not configured');
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${API_KEY}`
    );
    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        latitude: location.lat,
        longitude: location.lng,
        address: data.results[0].formatted_address
      };
    } else {
      throw new Error('Address not found');
    }
  },

  // Reverse geocode coordinates to address
  reverseGeocode: async (latitude, longitude) => {
    const API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    if (!API_KEY) {
      throw new Error('Google Maps API key not configured');
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${API_KEY}`
    );
    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0];
      const addressComponents = result.address_components;
      
      const getComponent = (type) => {
        const component = addressComponents.find(comp => comp.types.includes(type));
        return component ? component.long_name : '';
      };

      return {
        formatted_address: result.formatted_address,
        street: getComponent('route'),
        city: getComponent('locality') || getComponent('administrative_area_level_2'),
        state: getComponent('administrative_area_level_1'),
        pincode: getComponent('postal_code'),
        country: getComponent('country')
      };
    } else {
      throw new Error('Unable to get address for this location');
    }
  },

  // Calculate distance between two points
  calculateDistance: (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
  }
};