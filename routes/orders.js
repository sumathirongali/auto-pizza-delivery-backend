const express = require('express');
const Order = require('../models/Order');
const Pizza = require('../models/Pizza');
const router = express.Router();
const neo4j = require('neo4j-driver');
const dotenv = require('dotenv');
const loadDeliveriesToNeo4j = require('../dataSync/loadDeliveriesToNeo4j');
dotenv.config();


const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

router.post('/', async (req, res) => {
  const pizzaId = req.body.pizzaId;

  try {
    console.log(pizzaId);
    const pizza = await Pizza.findById(pizzaId);
    //if (!pizza) {
      //  return res.status(404).json({ message: 'Pizza not found' });
   // }

   const now = new Date();
   const timestamp = new Date(now.getTime() + (60 * 60 * 1000));

    // Create a new order with calculated delivery time
    const order = new Order({ pizza: pizzaId, deliveryTime: timestamp});
    await order.save();

    res.json({
      _id: order._id,
      pizza,
      deliveryStatus: 'Not Delivered',
      deliveryTime: timestamp
    });


    // Call the function whenever you want to load deliveries from MongoDB to Neo4j
    debugger;
    loadDeliveriesToNeo4j()
      .then(() => {
        console.log('Deliveries loaded to Neo4j successfully');
      })
      .catch((error) => {
        console.error('Error loading deliveries to Neo4j:', error);
      });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

