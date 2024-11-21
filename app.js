require('dotenv').config(); // Loads up the .env processor

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const Computer_Security = require('./schemas'); // Import schema
const { OpenAI } = require('openai'); // Correct import
const cors = require('cors'); // For cross-origin requests

const app = express();
const port = 3000;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // References the .env file
});

// MongoDB connection URL
const uri = "mongodb+srv://angelocabacungan:T8HLAYjpyDtd1trW@cluster0.03l3j.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Connect to MongoDB
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.error('MongoDB connection error:', error));

// Middleware
app.use(express.json());
app.use(cors());

// Serve static files from the root directory (no public folder)
app.use(express.static(__dirname)); // Serves files from the root folder

// Serve index.html when accessing the root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html')); // Serve index.html from root
});

// Route to fetch a random question
app.get('/random-question', async (req, res) => {
  try {
    const count = await Computer_Security.countDocuments(); // Count total documents
    const randomIndex = Math.floor(Math.random() * count);
    const question = await Computer_Security.findOne().skip(randomIndex); // Fetch random question
    
    res.status(200).json({
      _id: question._id, // Include the ID in the response
      question: question.question,
      A: question.A,
      B: question.B,
      C: question.C,
      D: question.D,
      correctAnswer: question.correctAnswer,
    });
  } catch (error) {
    console.error('Error retrieving random question:', error);
    res.status(500).json({ message: 'Error retrieving random question' });
  }
});

// Route to get ChatGPT response

app.post('/chatgpt-response', async (req, res) => {
  const { _id, question, A, B, C, D } = req.body;

  if (!_id || !question || !A || !B || !C || !D) {
    return res.status(400).json({ message: 'Question ID, question, and all options are required' });
  }

  try {
    // Create a formatted prompt including the question and options
    const prompt = `
    Question: ${question}

    Options:
    A: ${A}
    B: ${B}
    C: ${C}
    D: ${D}

    Please select the correct option (A, B, C, or D).
    `;

    // Record start time of query
    const startTime = Date.now();

    // Send the formatted prompt to ChatGPT
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
    });

    // Record end time of query
    const endTime = Date.now();

    // Calculate response time
    const responseTime = endTime - startTime;

    const chatGPTResponse = response.choices[0].message.content.trim();

    // Update the document in the database with the ChatGPT response
    const updatedDocument = await Computer_Security.findByIdAndUpdate(
      _id, // Use the document's ID to find it
      { chatGPTResponse }, // Update the `chatGPTResponse` field
      { new: true } // Return the updated document
    );

    if (!updatedDocument) {
      return res.status(404).json({ message: 'Document not found' });
    }

    res.status(200).json({ chatGPTResponse, updatedDocument, responseTime });
  } catch (error) {
    console.error('Error with ChatGPT API or MongoDB update:', error);
    res.status(500).json({ message: 'Error with ChatGPT API or updating the document' });
  }
});


// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
