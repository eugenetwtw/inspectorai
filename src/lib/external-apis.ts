import axios from 'axios';

// OpenWeather API
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Function to get weather data for a specific location and time
export async function getWeatherData(lat: number, lon: number, timestamp: number) {
  if (!OPENWEATHER_API_KEY) {
    throw new Error('Missing OpenWeather API key');
  }

  try {
    // OpenWeather API historical data endpoint
    const response = await axios.get(
      `https://api.openweathermap.org/data/3.0/onecall/timemachine`,
      {
        params: {
          lat,
          lon,
          dt: timestamp, // Unix timestamp
          appid: OPENWEATHER_API_KEY,
          units: 'metric',
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return null;
  }
}

// Function to get current weather data
export async function getCurrentWeather(lat: number, lon: number) {
  if (!OPENWEATHER_API_KEY) {
    throw new Error('Missing OpenWeather API key');
  }

  try {
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather`,
      {
        params: {
          lat,
          lon,
          appid: OPENWEATHER_API_KEY,
          units: 'metric',
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error fetching current weather data:', error);
    return null;
  }
}

// Function to get location information from coordinates using Google Maps Geocoding API
export async function getLocationFromCoordinates(lat: number, lon: number) {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Missing Google Maps API key');
  }

  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json`,
      {
        params: {
          latlng: `${lat},${lon}`,
          key: GOOGLE_MAPS_API_KEY,
        },
      }
    );

    if (response.data.status === 'OK' && response.data.results.length > 0) {
      return response.data.results[0];
    }

    return null;
  } catch (error) {
    console.error('Error fetching location data:', error);
    return null;
  }
}

// Function to get coordinates from an address using Google Maps Geocoding API
export async function getCoordinatesFromAddress(address: string) {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Missing Google Maps API key');
  }

  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json`,
      {
        params: {
          address,
          key: GOOGLE_MAPS_API_KEY,
        },
      }
    );

    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const { lat, lng } = response.data.results[0].geometry.location;
      return { lat, lon: lng };
    }

    return null;
  } catch (error) {
    console.error('Error fetching coordinates:', error);
    return null;
  }
}

// Function to extract location from natural language description
export async function extractLocationFromDescription(description: string) {
  // This is a simple implementation. In a production app, you might want to use
  // a more sophisticated NLP approach or OpenAI's API to extract location information.
  
  // For now, we'll just look for common patterns like "4F B區" (4th floor, zone B)
  const floorMatch = description.match(/(\d+)F/i);
  const zoneMatch = description.match(/([A-Z])區/i);
  
  const floor = floorMatch ? floorMatch[1] : null;
  const zone = zoneMatch ? zoneMatch[1] : null;
  
  return {
    floor,
    zone,
    rawDescription: description,
  };
}
