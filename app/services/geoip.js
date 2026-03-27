const geoipCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export const getCountryFromIP = async (ipAddress) => {
  try {
    if (!ipAddress || ipAddress === '127.0.0.1' || ipAddress === '::1' || ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.')) {
      return {
        country_code: 'US',
        country_name: 'United States',
        is_default: true
      };
    }

    const cached = geoipCache.get(ipAddress);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    const response = await fetch(`http://ip-api.com/json/${ipAddress}?fields=status,message,countryCode,country`);
    const data = await response.json();

    if (data.status === 'success') {
      const result = {
        country_code: data.countryCode,
        country_name: data.country,
        is_default: false
      };
      
      geoipCache.set(ipAddress, {
        data: result,
        timestamp: Date.now()
      });
      
      return result;
    }

    return {
      country_code: 'US',
      country_name: 'United States',
      is_default: true
    };
  } catch (error) {
    console.error('Geo-IP lookup failed:', error.message);
    return {
      country_code: 'US',
      country_name: 'United States',
      is_default: true,
      error: error.message
    };
  }
};

export const getClientIP = (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIP = req.headers['x-real-ip'];
  if (realIP) {
    return realIP;
  }
  
  return req.connection?.remoteAddress || 
         req.socket?.remoteAddress || 
         req.ip || 
         '127.0.0.1';
};

export const detectCountry = async (req) => {
  const ip = getClientIP(req);
  return await getCountryFromIP(ip);
};

export const clearCache = () => {
  geoipCache.clear();
};
