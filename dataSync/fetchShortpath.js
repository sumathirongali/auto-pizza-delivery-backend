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
  
  debugger;
  //fetch collection from mongodb
  const deliveries = await Delivery.find({});

  // fetch address and corresponding coordinates
  const stretInfo = deliveries.map((delivery) => {
    return {
      latitude: delivery.EndCoordinates.Latitude,
      longitude: delivery.EndCoordinates.Longitude,
      street: delivery.Street
    };
  });

  // Create or update the end location nodes in Neo4j
  for (let i = 0; i < stretInfo.length; i++) {
    const location = stretInfo[i];
    await session.run(`
    CREATE (n:Location5 {name: $str, lat:$lat, long:$lon })
    //RETURN n
    `, {
      lat: location.latitude,
      lon: location.longitude,
      str : location.street
    });
  }

  //remove already existing relationships
  //await session.run(`
  //MATCH (n:Location5) detach delete n
  //`)
  
  //create relationships and compute distance
  // from one to many and many to many
  // pass the distance between locations
  await session.run(`
  MATCH (n:Location5), (m:Location5)
  WHERE id(n) <> id(m)
  WITH n, m, point({ longitude: n.long, latitude: n.lat }) AS p1, point({ longitude: m.long, latitude: m.lat }) AS p2
  MERGE (n)-[:DISTANCE { distance: point.distance(p1, p2) }]->(m)
  MERGE (m)-[:DISTANCE { distance: point.distance(p1, p2) }]->(n)
  //RETURN *
  `)

  //clear the graph if already exists
  //await session.run(`
  //CALL gds.graph.drop('graph5')
  //`)
  
  //create a graph
  await session.run(`
  CALL gds.graph.project(
    'graph5',
    'Location5',
    {
      DISTANCE: {
        properties: 'distance',
        orientation: 'UNDIRECTED'
      }
    }
  )
  `)

  //$deliverLocation

  //minimum spanning tree calculation
  // for the given location
  await session.run(`
  MATCH (n:Location5 {name:'Hamburger Str'})
  CALL gds.beta.spanningTree.write('graph5', {
    sourceNode: id(n),
    relationshipWeightProperty: 'distance',
    writeProperty: 'MINST',
    writeRelationshipType: 'MINST'
  })
  YIELD preProcessingMillis, computeMillis, writeMillis, effectiveNodeCount
  RETURN preProcessingMillis, computeMillis, writeMillis, effectiveNodeCount
  `)

  //fetch result back 
  const mstpath = await session.run(`
  MATCH path = (n:Location5 {name: 'Hamburger Str'})-[:MINST]-()
  //return DISTINCT path
  WITH relationships(path) AS rels, path
  RETURN path, rels
  `)
  
  console.log(mstpath.records.forEach((record)=>{
    console.log(record._fields);
  }  
  ));

    /*
    // Check if the Cypher query is non-empty
    if (cypherQuery.trim() !== '') {
    // Run the Cypher query and retrieve the results
    session.run(cypherQuery)
      .then(result => {
        // Iterate over each result record
        result.records.forEach(record => {
          // Extract the path and relationships from the record
          const path = record.get('path');
          const rels = record.get('rels');

          // Process and use the path and relationships in your JavaScript code
          console.log(path);  // Example: Logging the path to the console
          console.log(rels);  // Example: Logging the relationships to the console
        });

        // Close the session and driver
        session.close();
        driver.close();
      })
      .catch(error => {
        console.error('Error executing Cypher query:', error);
        session.close();
        driver.close();
      });
  } else {
    console.error('Cypher query is empty!');
  }
  */
}  
module.exports = fetchShortPath;


