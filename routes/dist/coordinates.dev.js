"use strict";

var express = require('express');

var router = express.Router();

var Delivery = require('../models/Delivery'); // Get all delivery coordinates


router.get('/', function _callee(req, res) {
  var deliveries, coordinates;
  return regeneratorRuntime.async(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.prev = 0;
          _context.next = 3;
          return regeneratorRuntime.awrap(Delivery.find({}, 'StartCoordinates EndCoordinates'));

        case 3:
          deliveries = _context.sent;
          coordinates = deliveries.flatMap(function (delivery) {
            return [delivery.StartCoordinates, delivery.EndCoordinates];
          });
          res.status(200).send(coordinates);
          _context.next = 12;
          break;

        case 8:
          _context.prev = 8;
          _context.t0 = _context["catch"](0);
          console.error(_context.t0);
          res.status(500).send('Internal Server Error');

        case 12:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[0, 8]]);
});
module.exports = router;
//# sourceMappingURL=coordinates.dev.js.map
