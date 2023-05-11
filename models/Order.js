const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  pizza: { type: mongoose.Schema.Types.ObjectId, ref: 'Pizza', required: true },
  deliveryStatus: { type: String, enum: ['Assigned', 'In Transit', 'Delivered'], default: 'Assigned' },
  deliveryTime: { type: Number, required: true },
});

module.exports = mongoose.model('Order', orderSchema);
