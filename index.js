const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const pizzasRouter = require('./routes/pizzas');
const ordersRouter = require('./routes/orders');
const deliveryRouter = require('./routes/deliveries');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Failed to connect to MongoDB', err));
  

app.use('/api/pizzas', pizzasRouter);
app.use('/api/orders', ordersRouter);

app.use('/api/deliveries', deliveryRouter);

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
