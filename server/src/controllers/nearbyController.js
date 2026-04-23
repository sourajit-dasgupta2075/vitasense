import axios from "axios";

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || "";
const DEFAULT_RADIUS = 4000;
const EXPANDED_RADIUS = 5000;
const PLACES_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json";

function isValidLatitude(value) {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

function isValidLongitude(value) {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c * 1000;
}

function buildMapUrl(place) {
  if (place.place_id) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}`;
}

function normalizePlace(place, origin) {
  const distanceMeters = origin ? Math.round(haversineDistance(origin.lat, origin.lng, place.geometry.location.lat, place.geometry.location.lng)) : null;
  return {
    id: place.place_id || `${place.name}-${place.vicinity}`,
    name: place.name,
    address: place.vicinity || place.formatted_address || "Unknown address",
    rating: typeof place.rating === "number" ? place.rating : null,
    distanceMeters,
    distanceLabel: distanceMeters != null ? `${(distanceMeters / 1000).toFixed(1)} km` : "N/A",
    mapUrl: buildMapUrl(place),
    location: place.geometry?.location || null
  };
}

async function fetchHospitalResults(lat, lng, radius) {
  const response = await axios.get(PLACES_URL, {
    params: {
      key: GOOGLE_MAPS_API_KEY,
      location: `${lat},${lng}`,
      radius,
      type: "hospital"
    },
    timeout: 8000
  });

  if (response.data.status !== "OK" && response.data.status !== "ZERO_RESULTS") {
    throw new Error(response.data.error_message || response.data.status || "Google Places API error");
  }

  return Array.isArray(response.data.results)
    ? response.data.results.map((place) => normalizePlace(place, { lat, lng }))
    : [];
}

export async function getNearbyHospitals(req, res, next) {
  if (!GOOGLE_MAPS_API_KEY) {
    return res.status(500).json({ message: "Google Maps API key is not configured on the backend." });
  }

  const lat = Number(req.body?.lat);
  const lng = Number(req.body?.lng);

  if (!isValidLatitude(lat) || !isValidLongitude(lng)) {
    return res.status(400).json({ message: "Latitude and longitude must be valid numeric values." });
  }

  try {
    let hospitals = await fetchHospitalResults(lat, lng, DEFAULT_RADIUS);
    if (!hospitals.length) {
      hospitals = await fetchHospitalResults(lat, lng, EXPANDED_RADIUS);
    }

    return res.json({ success: true, data: hospitals });
  } catch (error) {
    return res.status(502).json({ message: "Unable to fetch nearby medical facilities.", error: error.message });
  }
}
