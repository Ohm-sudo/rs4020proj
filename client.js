// async function fetchQuestion() {
//     try {
//         const response = await fetch('/questions/random'); // Fetch a random question
//         const question = await response.json();
//         document.getElementById('question').innerText = question.text; // Display the question
        
//         const chatGptResponse = await fetchChatGPTResponse(question.text);
//         document.getElementById('chatgpt-response').innerText = chatGptResponse;
        
//         // You can add validation logic here to compare the ChatGPT response with the correct answer
//     } catch (error) {
//         console.error('Error fetching question:', error);
//     }
// }

// async function fetchChatGPTResponse(questionText) {
//     try {
//         const response = await fetch('/fetch-chatgpt-response', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json'
//             },
//             body: JSON.stringify({ prompt: questionText })
//         });
//         const data = await response.json();

//         console.log('Fetched ChatGPT Response:', data); // Log the response to verify

//         return data;
//     } catch (error) {
//         console.error('Error fetching ChatGPT response:', error);
//         return 'Error fetching response';
//     }
// }
