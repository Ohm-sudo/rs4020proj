require('dotenv').config();

// Modules
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const { OpenAI } = require('openai');
const models = require('./schemas');

// Setting up Express
const app = express();
const port = 3000;

// OpenAI Api Key and MongoDB Connection
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const mongoURI = process.env.MONGODB_URI;

// Initialize connection with MongoDB
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(__dirname)); // Serve static files from root
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html'))); // Serves the main HTML file, in this case its index.html

// Helper function to validate domain
const validateDomain = (domain) => models[domain];

// Helper function to handle errors and send responses
const handleError = (res, message, status = 400) => res.status(status).json({ message });

// Get ChatGPT's response
const getChatGPTResponse = async (prompt) => {
  try {
    // Retrieve's ChatGPT's response
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
    });

    // Extracts the letter from the response (A - D)
    const match = response.choices[0].message.content.trim().match(/^[A-D](?=:|$)/);
    // Returns the letter, or an empty string
    return match ? match[0] : '';

  } catch (error) {
    console.error('Error getting response from ChatGPT:', error);
    return '';
  }
};

// Fetch a random question
app.get('/random-question', async (req, res) => {
  const { domain } = req.query;

  // Validates the domain
  if (!validateDomain(domain)) return handleError(res, 'Invalid or missing domain');

  try {
    const Model = models[domain]; // Grabs the appropriate model for the domain
    const randomQuestion = await Model.aggregate([{ $sample: { size: 1 } }]); // Selects a random question from the selected domain
    if (!randomQuestion.length) return handleError(res, 'No question found for the selected domain', 404);
    res.status(200).json(randomQuestion[0]); // Returns the question
  } catch (err) {
    console.error('Error retrieving question:', err);
    handleError(res, 'Error retrieving question', 500);
  }
});

// Validate and update ChatGPT response for a single question
app.post('/chatgpt-response', async (req, res) => {
  const { domain, _id, question, A, B, C, D } = req.body;

  // Validates the domain and data being inputted
  if (!validateDomain(domain)) return handleError(res, 'Invalid or missing domain');
  if (!_id || !question || !A || !B || !C || !D) return handleError(res, 'Incomplete question data');

  try {
    const Model = models[domain]; // Get the appropriate model for the selected domain
    const prompt = `Question: ${question} Options: A: ${A}, B: ${B}, C: ${C}, D: ${D} Please select the correct option (A, B, C, or D) only.`;

    // Sends ChatGPT our prompt while also calculating the response time
    const startTime = Date.now(); // Initialize start time
    const chatGPTResponse = await getChatGPTResponse(prompt); // Sends ChatGPT our prompt and retrieves its response
    const responseTime = Date.now() - startTime; // Calculate response time

    // Gets the respective question from the database
    const questionDoc = await Model.findById(_id);
    if (!questionDoc) return handleError(res, 'Document not found', 404);

    // Compares ChatGPT's response to our anticipated answer to get our "accuracy"
    const accuracy = chatGPTResponse === questionDoc.correctAnswer ? 'Correct' : 'Incorrect';
    // Updates the respective question in the database with ChatGPT's response, accuracy, and response time
    const updatedDoc = await Model.findByIdAndUpdate(_id, { chatGPTResponse, accuracy, responseTime }, { new: true });

    res.status(200).json({ chatGPTResponse, accuracy, responseTime, updatedDoc });
  } catch (err) {
    console.error('Error processing ChatGPT response:', err);
    handleError(res, 'Error processing ChatGPT response', 500);
  }
});

// Generate ChatGPT responses for all questions in batches
app.get('/generate-chatgpt-responses', async (req, res) => {
  const { domain } = req.query;
  // Validates domain
  if (!validateDomain(domain)) return handleError(res, 'Invalid or missing domain');

  try {
    const Model = models[domain]; // Get the appropriate model for the selected domain
    const questions = await Model.find(); // Fetches all questions in the selected domain
    if (!questions.length) return handleError(res, 'No questions found', 404);

    // Batch Size and Delay configuration
    const batchSize = 10;
    const delayMs = 5000;

    // Processes the questions in batches
    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize);

      for (const { _id, question, A, B, C, D, correctAnswer } of batch) {
        const prompt = `Question: ${question} Options: A: ${A}, B: ${B}, C: ${C}, D: ${D} Please select the correct option (A, B, C, or D) only.`;
        try {
          const startTime = Date.now(); // Record start time
          const chatGPTResponse = await getChatGPTResponse(prompt); // Sends ChatGPT our prompt and retrieves its response
          const endTime = Date.now(); // Record end time
          const responseTime = endTime - startTime; // Calculates the response time

          // Compares ChatGPT's response to our anticipated answer to get our "accuracy"
          const accuracy = chatGPTResponse === correctAnswer ? 'Correct' : 'Incorrect';

          // Updates the database with the ChatGPTResponse, Accuracy, and Response Time
          await Model.findByIdAndUpdate(_id, { chatGPTResponse, accuracy, responseTime }, { new: true });
          console.log(`Updated question ID: ${_id} in ${domain}`);
        } catch (err) {
          console.error(`Error processing question ID: ${_id}`, err);
        }
      }

      if (i + batchSize < questions.length) {
        console.log(`Waiting ${delayMs / 1000}s before the next batch...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    res.status(200).json({ message: 'ChatGPT responses updated for all questions.' });
  } catch (err) {
    console.error('Error generating responses:', err);
    handleError(res, 'Error generating responses', 500);
  }
});
// NOT USED ANYMORE SINCE WE HAVE ATLAS CHARTS TO DISPLAY AVG RESPONSE TIME
// Calculate and return the Average Response Time
app.get('/average-response-time', async (req, res) => {
  const { domain } = req.query;
  // Validate domain
  if (!validateDomain(domain)) return handleError(res, 'Invalid or missing domain');

  try {
    const Model = models[domain];  // Get the correct model based on the domain

    // Calculates the Average Response Time
    const result = await Model.aggregate([
      { $match: { responseTime: { $exists: true } } },  // Filter for documents with the responseTime field
      {
        $group: {
          _id: null,  // Group all documents together
          averageResponseTime: { $avg: "$responseTime" }  // Calculate average of responseTime
        }
      }
    ]);

    // If no data exists, return an error message
    if (result.length === 0) {
      return res.status(404).json({ message: 'No response times found for the selected domain' });
    }

    // Send the average response time as a response
    const averageResponseTime = result[0].averageResponseTime;
    res.status(200).json({ domain, averageResponseTime });

  } catch (error) {
    console.error("Error fetching average response time:", error);
    handleError(res, 'Error fetching average response time', 500);
  }
});

app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
