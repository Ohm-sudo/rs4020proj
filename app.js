const mongoose = require('mongoose');
const fs = require('fs');

const uri = "mongodb+srv://angelocabacungan:T8HLAYjpyDtd1trW@cluster0.03l3j.mongodb.net/ChatGPT_Evaluation?retryWrites=true&w=majority&appName=Cluster0";

// Define a schema for your collection
const historySchema = new mongoose.Schema({
  _id: Number,
  question: String,
  A: String,
  B: String,
  C: String,
  D: String,
  correctAnswer: String,
  chatGPTResponse: String // Field for ChatGPT's response
}, { collection: 'History' }); // Explicitly set the collection name to 'History'

// Create a model based on the schema
const History = mongoose.model('History', historySchema);

async function run() {
  try {
    // Connect to MongoDB using Mongoose
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB using Mongoose!");

    // Read and parse the JSON file
    const data = JSON.parse(fs.readFileSync('data/historyData.json', 'utf8'));

    // Iterate over the data and upsert each document
    for (const doc of data) {
      await History.updateOne(
        { _id: doc._id },
        { $set: doc },
        { upsert: true }
      );
      console.log(`Document with _id: ${doc._id} was inserted/updated`);
    }

  } finally {
    // Close the Mongoose connection
    await mongoose.connection.close();
  }
}

run().catch(console.error);
