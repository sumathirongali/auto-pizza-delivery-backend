const express = require('express');
const router = express.Router();
const Delivery = require('../models/Delivery');

// Get all delivery coordinates
router.get('/', async (req, res) => {
  try {
    const deliveries = await Delivery.find({}, 'StartCoordinates EndCoordinates');
    const coordinates = deliveries.flatMap(delivery => [
      delivery.StartCoordinates,
      delivery.EndCoordinates
    ]);
    res.status(200).send(coordinates);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;
