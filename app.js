require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const { OpenAI } = require('openai');
const models = require('./schemas');

const app = express();
const port = 3000;

// OpenAI API setup
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// MongoDB setup
const mongoURI = process.env.MONGODB_URI;
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Middleware
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files from root

// Serve index.html
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// Utility to send a prompt to ChatGPT
const getChatGPTResponse = async (prompt) => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      max_tokens: 10, // Limit the response length to keep it short
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = response.choices[0].message.content.trim();

    // Try to match only the letter A, B, C, or D at the start of the response
    const match = responseText.match(/^(Option\s)?[A-D](?=:|$)/);

    if (match) {
      return match[0]; // Return the matched option (A, B, C, or D)
    } else {
      console.log("No match found for the options (A, B, C, or D).");
      return ''; // Return an empty string or handle differently
    }
  } catch (error) {
    console.error('Error while getting response from ChatGPT:', error);
    return ''; // Return an empty string if there’s an error
  }
};

// Fetch a random question
app.get('/random-question', async (req, res) => {
  const { domain } = req.query;

  if(!domain || !models[domain]) {
    return res.status(400).json({ message: 'Invalid or missing domain'});
  }
  
  try {
    const Model = models[domain]; // Get the appropriate model
    const count = await Model.countDocuments();
    const randomQuestion = await Model.findOne().skip(Math.floor(Math.random() * count));

    if (!randomQuestion) {
      return res.status(404).json({ message: 'No question found for the selected domain' });
    }

    res.status(200).json(randomQuestion);
  } catch (err) {
    console.error('Error retrieving question:', err);
    res.status(500).json({ message: 'Error retrieving question' });
  }
});

// Validate and update ChatGPT response for a single question
app.post('/chatgpt-response', async (req, res) => {
  const { domain, _id, question, A, B, C, D } = req.body;

  if(!domain || !models[domain]) {
    return res.status(400).json({ message: 'Invalid or missing domain' });
  }

  if (!_id || !question || !A || !B || !C || !D) {
    return res.status(400).json({ message: 'Incomplete question data' });
  }

  try {
    const Model = models[domain]; // Get the appropriate model based on the domain
    const prompt = `
      Question: ${question}
      Options: A: ${A}, B: ${B}, C: ${C}, D: ${D}
      Please select the correct option (A, B, C, or D) only, without any explanation.
    `;

    // Get the response from ChatGPT
    const chatGPTResponse = await getChatGPTResponse(prompt);
    
    // Update the document in the correct collection (based on the domain)
    const updatedDoc = await Model.findByIdAndUpdate(
      _id,
      { chatGPTResponse },
      { new: true }
    );

    if (!updatedDoc) return res.status(404).json({ message: 'Document not found' });

    res.status(200).json({ chatGPTResponse, updatedDoc });
  } catch (err) {
    console.error('Error processing ChatGPT response:', err);
    res.status(500).json({ message: 'Error processing ChatGPT response' });
  }
});

// Generate ChatGPT responses for all questions in batches
app.get('/generate-chatgpt-responses', async (req, res) => {
  const { domain } = req.query; // Get the domain from query parameters

  if(!domain || !models[domain]) {
    return res.status(400).json({ message: 'Invalid or missing domain' });
  }

  try {
    const Model = models[domain]; // Get the appropriate model based on the domain
    const questions = await Model.find();
    if (!questions.length) return res.status(404).json({ message: 'No questions found.' });

    const batchSize = 10;
    const delayMs = 2000;

    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize);

      for (const { _id, question, A, B, C, D } of batch) {
        const prompt = `
          Question: ${question}
          Options: A: ${A}, B: ${B}, C: ${C}, D: ${D}
          Please select the correct option (A, B, C, or D) only, without any explanation.
        `;

        try {
          const chatGPTResponse = await getChatGPTResponse(prompt);
          await Model.findByIdAndUpdate(_id, { chatGPTResponse }, { new: true });
          console.log(`Updated question ID: ${_id} in ${domain} domain`);
        } catch (err) {
          console.error(`Error processing question ID: ${_id} in ${domain} domain`, err);
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
    res.status(500).json({ message: 'Error generating responses' });
  }
});

// Start the server
app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
