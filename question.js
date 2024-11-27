const fetchQuestionButton = document.getElementById('fetchQuestion');
const validateAnswerButton = document.getElementById('validateAnswer');
const questionElement = document.getElementById('question');
const optionAElement = document.getElementById('optionA');
const optionBElement = document.getElementById('optionB');
const optionCElement = document.getElementById('optionC');
const optionDElement = document.getElementById('optionD');
const correctAnswerElement = document.getElementById('correctAnswer');
const responseElement = document.getElementById('response');
const generateResponseResult = document.getElementById('generateResponseResult');
const domainSelect = document.getElementById('domainSelect');

let currentQuestion = null;

// Fetch a random question
fetchQuestionButton.addEventListener('click', async () => {
    const domain = domainSelect.value; // Get selected domain from the dropdown
    try {
    const response = await fetch(`http://localhost:3000/random-question?domain=${domain}`);
    if (!response.ok) {
        throw new Error('Error fetching question');
    }
    const data = await response.json();

    // Display the question and options onto the website
    currentQuestion = data;
    document.getElementById('questionId').textContent = data._id;
    questionElement.textContent = data.question;
    optionAElement.textContent = data.A;
    optionBElement.textContent = data.B;
    optionCElement.textContent = data.C;
    optionDElement.textContent = data.D;
    correctAnswerElement.textContent = data.correctAnswer;

    // Clear previous ChatGPT response and response time
    responseElement.innerHTML = '';

    // Enable the "Validate Answer" button
    validateAnswerButton.disabled = false;
    } catch (error) {
    console.error('Error:', error);
    alert('Failed to fetch question');
    }
});


// Validate the answer with ChatGPT
validateAnswerButton.addEventListener('click', async () => {
    if (!currentQuestion) return;

    // Get selected domain from the dropdown
    const domain = document.getElementById('domainSelect').value;

    try {
    const response = await fetch('http://localhost:3000/chatgpt-response', {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json'
        },
        body: JSON.stringify({
        _id: currentQuestion._id,
        question: currentQuestion.question,
        A: currentQuestion.A,
        B: currentQuestion.B,
        C: currentQuestion.C,
        D: currentQuestion.D,
        domain: domain
        })
    });

    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.message);
    }

    // Display ChatGPT's response and Response Time on the website
    responseElement.innerHTML = `
    <p><strong>ChatGPT Response:</strong> ${result.chatGPTResponse}</p>
    <p><strong>Response Time:</strong> ${result.responseTime} ms</p>
`;    
    
    } catch (error) {
    console.error('Error:', error);
    alert('Failed to validate answer');
    }
});

// Generate ChatGPT responses for all questions in the selected domain
document.getElementById('generateChatGPTResponses').addEventListener('click', async () => {
    const selectedDomain = domainSelect.value; // Get selected domain from the dropdown
    try {
    const response = await fetch(`http://localhost:3000/generate-chatgpt-responses?domain=${selectedDomain}`);

    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.message);
    }

    // Show success message
    generateResponseResult.textContent = `Successfully generated ChatGPT responses for all questions in ${selectedDomain} domain.`;
    } catch (error) {
    console.error('Error generating responses:', error);
    generateResponseResult.textContent = `Failed to generate ChatGPT responses for ${selectedDomain} domain.`;
    }
});

// Fetch and display the average response time
async function fetchAverageResponseTime() {
  const domainSelect = document.getElementById('domainSelect');  // Get the selected domain
  const domain = domainSelect.value;

  try {
    // Fetch the average response time from the server
    const response = await fetch(`/average-response-time?domain=${domain}`);
    const data = await response.json();

    // If successful, update the DOM with the result
    if (response.ok) {
      const avgTime = data.averageResponseTime;
      const responseTimeElement = document.getElementById('average-response-time');
      responseTimeElement.innerHTML = `<strong>Average Response Time for ${domain}:</strong> ${avgTime.toFixed(2)} ms`;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Error fetching average response time:', error);
    const responseTimeElement = document.getElementById('average-response-time');
    responseTimeElement.textContent = 'Error fetching average response time';
  }
}

// Call the function to display the average response time on page load
document.addEventListener('DOMContentLoaded', fetchAverageResponseTime);

// Optional: Re-fetch when the domain is changed
document.getElementById('domainSelect').addEventListener('change', fetchAverageResponseTime);
