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

async function fetchShortPath() {
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
      MATCH (start:Location {latitude: $startLat, longitude: $startLon}), (end:Location {latitude: $lat, longitude: $lon})
      WHERE start <> end
      MERGE (start)-[:ROUTE {distance: point.distance(point({latitude: start.latitude, longitude: start.longitude}), point({latitude: end.latitude, longitude: end.longitude}))}]->(end)
    `, {
      startLat: startCoordinates[0].latitude,
      startLon: startCoordinates[0].longitude,
      lat: location.latitude,
      lon: location.longitude
    });
  }
  
  // Create relationships between end locations
for (let i = 0; i < endCoordinates.length; i++) {
    for (let j = i + 1; j < endCoordinates.length; j++) {
      const location1 = endCoordinates[i];
      const location2 = endCoordinates[j];
      await session.run(`
        MATCH (start:Location {latitude: $lat1, longitude: $lon1}), (end:Location {latitude: $lat2, longitude: $lon2})
        WHERE start <> end
        MERGE (start)-[:ROUTE {distance: point.distance(point({latitude: start.latitude, longitude: start.longitude}), point({latitude: end.latitude, longitude: end.longitude}))}]->(end)
      `, {
        lat1: location1.latitude,
        lon1: location1.longitude,
        lat2: location2.latitude,
        lon2: location2.longitude
      });
    }
  }

  // Find the shortest path using Dijkstra's algorithm
  const results = await session.run(`
    UNWIND  $endCoordinates AS end1
    UNWIND $endCoordinates AS end2
    MATCH (start:Location {name: 'Start'}), (endLocation1:Location {latitude: end1.latitude, longitude: end1.longitude}), (endLocation2:Location {latitude: end2.latitude, longitude: end2.longitude})
    WHERE start <> endLocation1 AND start <> endLocation2 AND endLocation1 <> endLocation2
    CALL apoc.algo.dijkstra(start, endLocation1, 'ROUTE', 'distance') YIELD path AS path1, weight AS weight1 
    CALL apoc.algo.dijkstra(endLocation1, endLocation2, 'ROUTE', 'distance') YIELD path AS path2, weight AS weight2 
    RETURN start, endLocation1, endLocation2,
     reduce(dist=0, r IN relationships(path1) | dist + r.distance) + reduce(dist=0, r IN relationships(path2) | dist + r.distance) AS distance, 
        COLLECT(DISTINCT [n IN nodes(path1) | {latitude: n.latitude, longitude: n.longitude}] + [n IN nodes(path2) | {latitude: n.latitude, longitude: n.longitude}]) AS path_nodes,
        COLLECT(DISTINCT [n IN nodes(path1) | n.name] + [n IN nodes(path2) | n.name]) AS path_names
    //RETURN start, endLocation1, endLocation2, distance, path_nodes, path_names
    ORDER BY distance ASC

    //MATCH (start:Location {name: 'Start'}), (endLocation:Location {latitude: end.latitude, longitude: end.longitude})
    //WHERE start <> endLocation
    //CALL apoc.algo.dijkstra(start, endLocation, 'ROUTE', 'distance') YIELD path, weight 
    //WHERE source <> end 
    //RETURN start, endLocation, reduce(dist=0, r IN relationships(path) | dist + r.distance) AS distance, 
    //    [n IN nodes(path) | {latitude: n.latitude, longitude: n.longitude}] AS path_nodes,
    //    [n IN nodes(path) | n.name] AS path_names 
    //    //ORDER BY distance ASC
  `, {
    endCoordinates
  });

  console.log(results.records);

        
        const paths = results.records.map((record) => {
        return {
        start: record.get('start'),
        end1: record.get('endLocation1'),
        end2: record.get('endLocation2'),
        distance: record.get('distance'),
        pathNodes: record.get('path_nodes'),
        pathNames: record.get('path_names')
        };
        });
        
        console.log(paths);


    // Create a table object with the columns you want
const table = [
    ['Start', 'End', 'Distance', 'Path']
  ];
  
  // Iterate through paths array and add rows to the table
  for (let i = 0; i < paths.length; i++) {
    const path = paths[i];
    const startPoint = path.start.properties;
    const endPoint = path.end.properties;
  
    // Find the shortest path to other end points
    // Find the shortest path from the current end point to the other end points
const otherEndPoints = paths.filter((p) => p !== path);

let shortestDistance = null;
let nextEndLocation = null;
let nextStartLocation = null;

for (let j = 0; j < otherEndPoints.length; j++) {
    const otherEndPoint = otherEndPoints[j].end.properties;

    // If the other end point is the same as the current end point, skip the rest of the loop
    if (endPoint.latitude === otherEndPoint.latitude && endPoint.longitude === otherEndPoint.longitude) {
        continue;
    }

    const result = await session.run(`
        MATCH (start:Location {latitude: $startLat, longitude: $startLon}), (end:Location {latitude: $endLat, longitude: $endLon})
        CALL apoc.algo.dijkstra(start, end, 'ROUTE', 'distance') YIELD path, weight
        RETURN reduce(dist=0, r IN relationships(path) | dist + r.distance) AS distance
    `, {
        startLat: endPoint.latitude,
        startLon: endPoint.longitude,
        endLat: otherEndPoint.latitude,
        endLon: otherEndPoint.longitude
    });

    const distance = result.records[0].get('distance');

    if (shortestDistance === null || distance < shortestDistance) {
        shortestDistance = distance;
        nextEndLocation = otherEndPoints[j].end;
        nextStartLocation = endPoint;
    }
}

if (nextEndLocation !== null) {
    console.log(`Next shortest path: (${nextStartLocation.latitude}, ${nextStartLocation.longitude}) to (${nextEndLocation.properties.latitude}, ${nextEndLocation.properties.longitude})`);
} else {
    console.log('No other end points to deliver to');
}

  
    // Add the row to the table
    /*table.push([
      `(${startPoint.latitude}, ${startPoint.longitude})`,
      `(${endPoint.latitude}, ${endPoint.longitude})`,
      path.distance.toFixed(2),
      shortestPath ? `(${shortestPath.end.properties.latitude}, ${shortestPath.end.properties.longitude})` : 'None'
    ]);*/
  }
  
  // Log the table
  console.table(table);
}  
  
    module.exports = fetchShortPath;
