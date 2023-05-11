const express = require('express');
const Pizza = require('../models/Pizza');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    debugger;
    const pizzas = await Pizza.find();
    res.json(pizzas);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
