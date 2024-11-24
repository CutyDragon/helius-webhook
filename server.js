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
  const transactions = req.body.transactions || [];
  console.log('Received data:', transactions);

  // Process transaction data
  const processedMessage = processTransactionData(transactions);

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
        // Basic transaction info
        const signature = tx.signature || 'Unknown';
        const type = tx.type || 'Unknown';
        const timestamp = new Date(tx.timestamp * 1000).toLocaleString();
        const status = tx.meta?.err ? 'Failed' : 'Successful';

        // Token transfers
        const tokenTransfers = tx.tokenTransfers?.map(transfer => ({
            from: transfer.fromUserAccount,
            to: transfer.toUserAccount,
            amount: transfer.tokenAmount,
            token: {
                name: transfer.tokenName,
                symbol: transfer.tokenSymbol,
                mint: transfer.mint
            }
        })) || [];

        // Native transfers
        const nativeTransfers = tx.nativeTransfers?.map(transfer => ({
            from: transfer.fromUserAccount,
            to: transfer.toUserAccount,
            amount: transfer.amount / 1e9  // Convert lamports to SOL
        })) || [];

        formattedTransactions += `
            **Transaction:** ${signature}
            **Type:** ${type}
            **Time:** ${timestamp}
            **Status:** ${status}
            ${tokenTransfers.map(t => `
                **Token Transfer:**
                From: ${t.from}
                To: ${t.to}
                Amount: ${t.amount} ${t.token.symbol}
                Token: ${t.token.name} (${t.token.mint})
            `).join('\n')}
            ${nativeTransfers.map(t => `
                **SOL Transfer:**
                From: ${t.from}
                To: ${t.to}
                Amount: ${t.amount} SOL
            `).join('\n')}
            -----------------
        `;
    });

    return formattedTransactions;
  }
  

// Function to send data to Discord
function sendToDiscord(message) {
    console.log('Sending to Discord:', message);
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

