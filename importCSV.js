require('dotenv').config();

const mongoose = require('mongoose');
const csv = require('csvtojson');
const path = require('path');

// Import the schemas for different domains
const { Computer_Security, Social_Science, History } = require('./schemas'); // Assuming schemas.js exports models for each domain

// MongoDB URI
const uri = process.env.MONGODB_URI;

// List of available domains and their corresponding CSV files
const domains = {
  Computer_Security: 'computerSecurityData.csv',
  Social_Science: 'sociologyData.csv',
  History: 'preHistoryData.csv'
};

// Function to import CSV data
async function importCSVToMongoDB(domain) {
  try {
    // Connect to MongoDB
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("Connected to MongoDB");

    // Determine the CSV file and model based on the domain
    let csvFilePath, Model;
    switch (domain) {
      case 'Computer_Security':
        csvFilePath = path.join(__dirname, 'data', domains.Computer_Security);
        Model = Computer_Security;
        break;
      case 'Social_Science':
        csvFilePath = path.join(__dirname, 'data', domains.Social_Science);
        Model = Social_Science;
        break;
      case 'History':
        csvFilePath = path.join(__dirname, 'data', domains.History);
        Model = History;
        break;
      default:
        throw new Error('Invalid domain');
    }

    // Load the CSV file into JSON format
    const jsonArray = await csv().fromFile(csvFilePath);

    // Insert only 50 entries (can adjust if needed)
    const limitedEntries = jsonArray.slice(0, 50);

    for (const doc of limitedEntries) {
      await Model.updateOne(
        { _id: doc._id },
        { $set: doc },
        { upsert: true }
      );
      console.log(`Document with _id: ${doc._id} was inserted/updated`);
    }

    console.log(`${domain} data successfully imported to MongoDB`);
  } catch (error) {
    console.error("Error importing CSV to MongoDB:", error);
  } finally {
    // Close the MongoDB connection
    await mongoose.connection.close();
  }
}

// Run the import function for all domains if no specific domain is provided
async function importAllDomains() {
  const domainsList = Object.keys(domains);

  for (const domain of domainsList) {
    await importCSVToMongoDB(domain);
  }

  console.log("All domains have been imported.");
}

// Check if a specific domain was passed as an argument
const domain = process.argv[2];

// If a domain is specified, import that domain; otherwise, import all domains
if (domain) {
  if (!domains[domain]) {
    console.error('Invalid domain specified. Please use one of the following: Computer_Security, Social_Science, or History');
    process.exit(1);
  }
  importCSVToMongoDB(domain);
} else {
  importAllDomains();
}
