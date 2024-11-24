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

    // Display the question and options
    currentQuestion = data;
    document.getElementById('questionId').textContent = data._id; // Display the question ID
    questionElement.textContent = data.question;
    optionAElement.textContent = data.A;
    optionBElement.textContent = data.B;
    optionCElement.textContent = data.C;
    optionDElement.textContent = data.D;
    correctAnswerElement.textContent = data.correctAnswer;

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

    const domain = document.getElementById('domainSelect').value; // Get selected domain from the dropdown

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

    // Display ChatGPT's response
    responseElement.textContent = `ChatGPT Response: ${result.chatGPTResponse}`;
    
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
