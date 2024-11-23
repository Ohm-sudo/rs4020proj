const mongoose = require('mongoose');

// Common schema definition for all domains
const questionSchema = new mongoose.Schema({
  _id: Number,
  question: String,
  A: String,
  B: String,
  C: String,
  D: String,
  correctAnswer: String,
  chatGPTResponse: String, // Field for storing ChatGPT's response
  accuracy: String,
});

// Models for different collections/domains
const Computer_Security = mongoose.model('Computer_Security', questionSchema, 'Computer_Security');
const History = mongoose.model('History', questionSchema, 'History');
const Social_Science = mongoose.model('Social_Science', questionSchema, 'Social_Science');

// Export models as a map for convenience
module.exports = {
  Computer_Security,
  History,
  Social_Science,
};
