const express = require('express');
const router = express.Router();
const hospitalController = require('../controllers/hospitalController');
const { verifyToken } = require('../middleware/auth'); // Assuming existing auth middleware

// Secure endpoint requiring Firebase JWT
router.post('/nearby-hospitals', verifyToken, hospitalController.getNearbyHospitals);

module.exports = router;