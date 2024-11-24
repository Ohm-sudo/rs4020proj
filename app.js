require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const { OpenAI } = require('openai');
const models = require('./schemas');

const app = express();
const port = 3000;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const mongoURI = process.env.MONGODB_URI;

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

app.use(express.json());
app.use(cors());
app.use(express.static(__dirname)); // Serve static files from root
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// Helper function to validate domain
const validateDomain = (domain) => models[domain];

// Helper function to handle errors and send responses
const handleError = (res, message, status = 400) => res.status(status).json({ message });

// Get ChatGPT response
const getChatGPTResponse = async (prompt) => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
    });

    const match = response.choices[0].message.content.trim().match(/^[A-D](?=:|$)/);
    return match ? match[0] : '';
  } catch (error) {
    console.error('Error getting response from ChatGPT:', error);
    return '';
  }
};

// Fetch a random question
app.get('/random-question', async (req, res) => {
  const { domain } = req.query;

  if (!validateDomain(domain)) return handleError(res, 'Invalid or missing domain');

  try {
    const Model = models[domain];
    const randomQuestion = await Model.aggregate([{ $sample: { size: 1 } }]);
    if (!randomQuestion.length) return handleError(res, 'No question found for the selected domain', 404);
    res.status(200).json(randomQuestion[0]);
  } catch (err) {
    console.error('Error retrieving question:', err);
    handleError(res, 'Error retrieving question', 500);
  }
});

// Validate and update ChatGPT response for a single question
app.post('/chatgpt-response', async (req, res) => {
  const { domain, _id, question, A, B, C, D } = req.body;

  if (!validateDomain(domain)) return handleError(res, 'Invalid or missing domain');
  if (!_id || !question || !A || !B || !C || !D) return handleError(res, 'Incomplete question data');

  try {
    const Model = models[domain];
    const prompt = `Question: ${question} Options: A: ${A}, B: ${B}, C: ${C}, D: ${D} Please select the correct option (A, B, C, or D) only.`;

    const chatGPTResponse = await getChatGPTResponse(prompt);
    const questionDoc = await Model.findById(_id);
    if (!questionDoc) return handleError(res, 'Document not found', 404);

    const accuracy = chatGPTResponse === questionDoc.correctAnswer ? 'Correct' : 'Incorrect';
    const updatedDoc = await Model.findByIdAndUpdate(_id, { chatGPTResponse, accuracy }, { new: true });

    res.status(200).json({ chatGPTResponse, accuracy, updatedDoc });
  } catch (err) {
    console.error('Error processing ChatGPT response:', err);
    handleError(res, 'Error processing ChatGPT response', 500);
  }
});

// Generate ChatGPT responses for all questions in batches
app.get('/generate-chatgpt-responses', async (req, res) => {
  const { domain } = req.query;

  if (!validateDomain(domain)) return handleError(res, 'Invalid or missing domain');

  try {
    const Model = models[domain];
    const questions = await Model.find();
    if (!questions.length) return handleError(res, 'No questions found', 404);

    const batchSize = 10;
    const delayMs = 5000;

    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize);

      for (const { _id, question, A, B, C, D, correctAnswer } of batch) {
        const prompt = `Question: ${question} Options: A: ${A}, B: ${B}, C: ${C}, D: ${D} Please select the correct option (A, B, C, or D) only.`;
        try {
          const startTime = Date.now(); // Record start time
          const chatGPTResponse = await getChatGPTResponse(prompt);
          const endTime = Date.now(); // Record end time
          const responseTime = endTime - startTime;

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

// API route to calculate and return the average response time
app.get('/average-response-time', async (req, res) => {
  const { domain } = req.query;  // Expecting domain as query parameter

  if (!validateDomain(domain)) return handleError(res, 'Invalid or missing domain');  // Validate domain

  try {
    const Model = models[domain];  // Get the correct model based on the domain

    // Aggregate to calculate the average response time
    const result = await Model.aggregate([
      { $match: { responseTime: { $exists: true } } },  // Filter for documents with responseTime field
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
