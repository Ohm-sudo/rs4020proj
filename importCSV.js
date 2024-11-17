const mongoose = require('mongoose');
const Computer_Security = require('./schemas'); // Adjust this if 'schemas.js' exports the model directly
const csv = require('csvtojson');
const path = require('path');

// MongoDB URI (replace with your actual URI)
const uri = "mongodb+srv://angelocabacungan:T8HLAYjpyDtd1trW@cluster0.03l3j.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Function to import CSV data
async function importCSVToMongoDB() {
  try {
    // Connect to MongoDB
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("Connected to MongoDB");

    // Load CSV file
    const csvFilePath = path.join(__dirname, 'data', 'computerSecurityData.csv');
    const jsonArray = await csv().fromFile(csvFilePath);

    // Insert only 50 entries
    const limitedEntries = jsonArray.slice(0, 50);

    for (const doc of limitedEntries) {
      await Computer_Security.updateOne(
        { _id: doc._id },
        { $set: doc },
        { upsert: true }
      );
      console.log(`Document with _id: ${doc._id} was inserted/updated`);
    }

    console.log("CSV data successfully imported to MongoDB");
  } catch (error) {
    console.error("Error importing CSV to MongoDB:", error);
  } finally {
    // Close the MongoDB connection
    await mongoose.connection.close();
  }
}

// Run the import function
importCSVToMongoDB();
