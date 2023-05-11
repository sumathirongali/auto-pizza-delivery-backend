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

async function loadDeliveriesToNeo4j2() {
  console.log('Loading deliveries to Neo4j...');
  const deliveries = await Delivery.find({});

  // Define start coordinates
  const startCoordinates = {
    latitude: 49.344448,
    longitude: 8.686868
  };

  // Define end coordinates
  const endCoordinates = deliveries.map((delivery) => {
    return {
      latitude: delivery.EndCoordinates.Latitude,
      longitude: delivery.EndCoordinates.Longitude
    };
  });

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
    lat: startCoordinates.latitude,
    lon: startCoordinates.longitude
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
    MATCH (start:Location {name: 'Start'}), (end:Location)
    WHERE end <> start
    CALL apoc.algo.dijkstra(start, end, 'ROUTE', 'distance') YIELD path, weight
    WITH start, end, path, weight
    RETURN reduce(dist=0, r IN relationships(path) | dist + r.distance) AS distance, 
         [n IN nodes(path) | {latitude: n.latitude, longitude: n.longitude}] AS path_nodes, 
         [n IN nodes(path) | n.name] AS path_names
  `);

  const distance = result.records[0].get('distance');
  const pathNodes = result.records[0].get('path_nodes');
  const pathNames = result.records[0].get('path_names');

  console.log('Distance:', distance);
  console.log('Path nodes:', pathNodes);
  console.log('Path names:', pathNames);

  const totalPath = pathNodes.map(node => {
    return {
      latitude: node.latitude,
      longitude: node.longitude
    };
  });

  console.log('Total path:', totalPath);


  await session.close();
  await driver.close();
}

module.exports = loadDeliveriesToNeo4j2();