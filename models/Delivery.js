const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  Order: { type: String, required: true },
  Name: { type: String, required: true },
  Email: { type: String, required: true },
  Mobile: { type: String, required: true },
  Street: { type: String, required: true },
  HouseNo: { type: String, required: true },
  City: { type: String, required: true },
  PinCode: { type: String, required: true },
  StartCoordinates: {
    Latitude: {type: Number,  required: true, default: 49.344448},
    Longitude: {type: Number,  required: true, default: 8.686868},
  },
  EndCoordinates: {
    Latitude: {type: Number,  required: true},
    Longitude: {type: Number,  required: true},
  },
  deliveryStatus: { type: String, enum: ['Assigned', 'In Transit', 'Delivered'], default: 'Assigned' },
  OrderedTime: { type: Number, required: true },
});

module.exports = mongoose.model('Delivery', deliverySchema);
