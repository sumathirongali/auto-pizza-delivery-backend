const express = require('express');
const Delivery = require('../models/Delivery');
const router = express.Router();
const neo4j = require('neo4j-driver');
const dotenv = require('dotenv');
const fetchShortPath = require('../dataSync/fetchShortpath');
const fetchCoordinates = require('../dataSync/fetchCoordinates');
dotenv.config();


const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
  );

router.get('/', async (req, res) => {
  try {
    debugger;
    const deliveries = await Delivery.find();
    res.json(deliveries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }


});


router.post('/', async (req, res) => {

  const now = new Date();

  const { Street, HouseNo, City, PinCode } = req.body;
  const coordinates = await fetchCoordinates(Street, HouseNo, City, PinCode);

  const delivery = new Delivery({
    Order: req.body.Order,
    Name: req.body.Name,
    Email: req.body.Email,
    Mobile: req.body.Mobile,
    Street: req.body.Street,
    HouseNo: req.body.HouseNo,
    City: req.body.City,
    PinCode: req.body.PinCode,
    EndCoordinates: {
      Latitude: coordinates.latitude,
      Longitude: coordinates.longitude
    },
    deliveryStatus: 'Assigned',
    OrderedTime: Date.now()
  });

  try {
    const newDelivery = await delivery.save();
    res.status(201).json(newDelivery);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }

  // Call the function whenever you want to load deliveries from MongoDB to Neo4j
  debugger;
  fetchShortPath()
    .then(() => {
      console.log('Deliveries loaded to Neo4j successfully');
    })
    .catch((error) => {
      console.error('Error loading deliveries to Neo4j:', error);
    }); 
    
});

module.exports = router;
