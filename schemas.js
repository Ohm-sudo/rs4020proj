// schemas.js
const mongoose = require('mongoose');

const computerSecuritySchema = new mongoose.Schema({
  _id: Number,
  question: String,
  A: String,
  B: String,
  C: String,
  D: String,
  correctAnswer: String,
  chatGPTResponse: String,
  responseTime: Number
}, { collection: 'Computer_Security' });

const Computer_Security = mongoose.model('Computer_Security', computerSecuritySchema);

module.exports = Computer_Security; // Export the model directly
