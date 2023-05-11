const axios = require('axios');

async function fetchCoordinates(street, houseNo, city, pinCode) {
    debugger;
  try {
    const address = `${houseNo} ${street}, ${city} ${pinCode}`;
    const response = await axios.get(`https://nominatim.openstreetmap.org/search?q=${address}&format=json&addressdetails=1&limit=1`);
    const { lat, lon } = response.data[0];
    return { latitude: lat, longitude: lon };
  } catch (error) {
    console.error(error);
    return null;
  }
}


module.exports = fetchCoordinates;

