const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

// Create an Express application
const app = express();

// Set your secret key (this should match Helius webhook secret)
const SECRET_KEY = 'my_helius_secret_key_123123123!!!';

// Discord Webhook URL
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1309187806459068496/XfUyEX0qfNCvqED3-ZysWB-MMpq8FiFCHkj-rUhfkPNvVxElXkLaW4dNgYnSYiU-IOn5';

// Middleware to parse incoming JSON
app.use(bodyParser.json());

// Define the /webhook endpoint that Helius will send data to
app.post('/webhook', (req, res) => {
  const authHeader = req.headers['authorization'];

  // Check if the request is authorized
  if (authHeader !== `Bearer ${SECRET_KEY}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Get transaction data from the request
  const transactionData = req.body;
  console.log('Received data:', transactionData);

  // Process transaction data
  const processedMessage = processTransactionData(transactionData);

  // Send the processed data to Discord
  sendToDiscord(processedMessage);

  // Respond to Helius
  return res.status(200).json({ message: 'Transaction data processed successfully' });
});

// Function to process transaction data
function processTransactionData(data) {
    const transactions = data.transactions || [];
    let formattedTransactions = '';
  
    transactions.forEach(tx => {
      const signature = tx.signature || 'Unknown';
      const feePayer = tx.feePayer || 'Unknown';
      const blockTime = new Date(tx.blockTime * 1000).toLocaleString(); // Convert Unix timestamp to human-readable
      const status = tx.meta && tx.meta.err ? 'Failed' : 'Successful';
      const amount = (tx.tokenTransfers && tx.tokenTransfers[0] && tx.tokenTransfers[0].amount) || 'N/A';
  
      // Token information: Update this based on the actual data structure in your Helius webhook
      const tokenName = (tx.tokenTransfers && tx.tokenTransfers[0] && tx.tokenTransfers[0].tokenName) || 'Unknown Token';
      const tokenSymbol = (tx.tokenTransfers && tx.tokenTransfers[0] && tx.tokenTransfers[0].tokenSymbol) || 'Unknown Symbol';
  
      formattedTransactions += `
        **Transaction:** ${signature}
        **From:** ${feePayer}
        **Status:** ${status}
        **Time:** ${blockTime}
        **Amount:** ${amount} ${tokenSymbol}
        **Token Name:** ${tokenName}
        -----------------
      `;
    });
  
    return formattedTransactions;
  }
  

// Function to send data to Discord
function sendToDiscord(message) {
  const payload = {
    content: message,
  };

  axios.post(DISCORD_WEBHOOK_URL, payload)
    .then(response => {
      console.log('Sent to Discord, status code:', response.status);
    })
    .catch(error => {
      console.error('Error sending to Discord:', error.response ? error.response.data : error.message);
    });
}

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
