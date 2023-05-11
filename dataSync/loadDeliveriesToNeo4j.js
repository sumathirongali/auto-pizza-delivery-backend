const mongoose = require('mongoose');
const neo4j = require('neo4j-driver');
const Delivery = require('../models/Delivery');
const dotenv = require('dotenv');
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const NEO4J_URI = process.env.NEO4J_URI;
const NEO4J_USER = process.env.NEO4J_USER;
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD;

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
const session = driver.session();

async function loadDeliveriesToNeo4j() {
  console.log('Loading deliveries to Neo4j...');
  const deliveries = await Delivery.find({});

  // Define start coordinates
  const startCoordinates = deliveries.map((delivery) => {
    return {
      latitude: delivery.StartCoordinates.Latitude,
      longitude: delivery.StartCoordinates.Longitude
    };
  });

  // Define end coordinates
  const endCoordinates = deliveries.map((delivery) => {
    return {
      latitude: delivery.EndCoordinates.Latitude,
      longitude: delivery.EndCoordinates.Longitude
    };
  });
  debugger;
  // Create or update the location nodes in Neo4j
  for (let i = 0; i < endCoordinates.length; i++) {
    const location = endCoordinates[i];
    await session.run(`
      MERGE (loc:Location { latitude: $lat, longitude: $lon })
    `, {
      lat: location.latitude,
      lon: location.longitude
    });
  }

  // Create start location node
  await session.run(`
    MERGE (start:Location {latitude: $lat, longitude: $lon})
    ON CREATE SET start.name = 'Start'
  `, {
    lat: startCoordinates[0].latitude,
    lon: startCoordinates[0].longitude
  });

  // Create relationships between start location and end locations
  for (let i = 0; i < endCoordinates.length; i++) {
    const location = endCoordinates[i];
    await session.run(`
      MATCH (start:Location {name: 'Start'}), (end:Location {latitude: $lat, longitude: $lon})
      CREATE (start)-[:ROUTE {distance: point.distance(start.coordinates, end.coordinates)}]->(end)
    `, {
      lat: location.latitude,
      lon: location.longitude
    });
  }

  // Find the shortest path using Dijkstra's algorithm
  const result = await session.run(` 
    WITH $startCoordinates AS startPoint, $endCoordinates AS endPoints UNWIND endPoints AS endPoint 
    MATCH (start:Location {coordinates: startPoint}), (end:Location {coordinates: point({latitude: endPoint.latitude, longitude: endPoint.longitude})}) 
    CALL apoc.algo.dijkstra(start, end, 'ROUTE', 'distance') YIELD path, weight 
    WITH start, end, path, weight 
    RETURN reduce(dist=0, r IN relationships(path) | dist + r.distance) AS distance, 
        [n IN nodes(path) | {latitude: n.coordinates.latitude, longitude: n.coordinates.longitude}] AS path_nodes, 
        [n IN nodes(path) | n.name] AS path_names 
    `, {
    startCoordinates,
    endCoordinates
    });
    
    console.log(result); // Print the result

  }
  
    module.exports = loadDeliveriesToNeo4j();
