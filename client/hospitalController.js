const axios = require('axios');

/**
 * Fetches nearby hospitals using Google Places API
 * POST /api/nearby-hospitals
 */
exports.getNearbyHospitals = async (req, res) => {
  const { lat, lng } = req.body;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'Coordinates required' });
  }

  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=5000&type=hospital&key=${apiKey}`
    );

    const hospitals = response.data.results.map((place) => ({
      id: place.place_id,
      name: place.name,
      address: place.vicinity,
      rating: place.rating,
      location: place.geometry.location,
      mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}`
    }));

    res.json({ success: true, data: hospitals });
  } catch (error) {
    console.error('Google Maps API Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch nearby medical facilities' });
  }
};