// const express = require('express');
// const axios = require('axios');
// const bodyParser = require('body-parser');

// // Create an Express application
// const app = express();

// // Set your secret key (this should match Helius webhook secret)
// const SECRET_KEY = 'my_helius_secret_key_123123123!!!';

// // Discord Webhook URL
// const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1309187806459068496/XfUyEX0qfNCvqED3-ZysWB-MMpq8FiFCHkj-rUhfkPNvVxElXkLaW4dNgYnSYiU-IOn5';

// // Middleware to parse incoming JSON
// app.use(bodyParser.json());

// // Define the /webhook endpoint that Helius will send data to
// app.post('/webhook', (req, res) => {
//   const authHeader = req.headers['authorization'];

//   // Check if the request is authorized
//   if (authHeader !== `Bearer ${SECRET_KEY}`) {
//     return res.status(401).json({ error: 'Unauthorized' });
//   }

//   // Get transaction data from the request
//   const transactionData = req.body;
//   console.log('Received data:', transactionData);

//   // Process transaction data
//   const processedMessage = processTransactionData(transactionData);

//   // Send the processed data to Discord
//   sendToDiscord(processedMessage);

//   // Respond to Helius
//   return res.status(200).json({ message: 'Transaction data processed successfully' });
// });

// // Function to process transaction data
// function processTransactionData(data) {
//     const transactions = data.transactions || [];
//     let formattedTransactions = '';
  
//     transactions.forEach(tx => {
//       const signature = tx.signature || 'Unknown';
//       const feePayer = tx.feePayer || 'Unknown';
//       const blockTime = new Date(tx.blockTime * 1000).toLocaleString(); // Convert Unix timestamp to human-readable
//       const status = tx.meta && tx.meta.err ? 'Failed' : 'Successful';
//       const amount = (tx.tokenTransfers && tx.tokenTransfers[0] && tx.tokenTransfers[0].amount) || 'N/A';
  
//       // Token information: Update this based on the actual data structure in your Helius webhook
//       const tokenName = (tx.tokenTransfers && tx.tokenTransfers[0] && tx.tokenTransfers[0].tokenName) || 'Unknown Token';
//       const tokenSymbol = (tx.tokenTransfers && tx.tokenTransfers[0] && tx.tokenTransfers[0].tokenSymbol) || 'Unknown Symbol';
  
//       formattedTransactions += `
//         **Transaction:** ${signature}
//         **From:** ${feePayer}
//         **Status:** ${status}
//         **Time:** ${blockTime}
//         **Amount:** ${amount} ${tokenSymbol}
//         **Token Name:** ${tokenName}
//         -----------------
//       `;
//     });
  
//     return formattedTransactions;
//   }
  

// // Function to send data to Discord
// function sendToDiscord(message) {
//   const payload = {
//     content: message,
//   };

//   axios.post(DISCORD_WEBHOOK_URL, payload)
//     .then(response => {
//       console.log('Sent to Discord, status code:', response.status);
//     })
//     .catch(error => {
//       console.error('Error sending to Discord:', error.response ? error.response.data : error.message);
//     });
// }

// // Start the server
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`Server is running on http://localhost:${PORT}`);
// });


const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 3000;

app.use(express.json());

// Solana token metadata endpoint
const SOLANA_RPC_URL = "https://api.mainnet-beta.solana.com"; 

// Discord webhook URL
const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/YOUR_DISCORD_WEBHOOK_URL";

// Helius webhook secret for verification (optional but recommended for security)
const HELIUS_SECRET = "my_helius_secret_key_123123123!!!";

app.post('/helius-webhook', async (req, res) => {
    // Verify request (if using webhook secret)
    if (req.headers['authorization'] !== HELIUS_SECRET) {
        return res.status(401).send('Unauthorized');
    }

    try {
        const { transactions } = req.body;

        for (const tx of transactions) {
            const { sender, receiver, amount, tokenAddress, time } = extractTransactionData(tx);
            
            // Get token name if only token address is available
            let tokenName = tx.tokenName;  // Assume Helius might provide tokenName sometimes
            if (!tokenName) {
                tokenName = await getTokenName(tokenAddress);
            }

            const message = {
                content: `Transaction Details:\nSender: ${sender}\nReceiver: ${receiver}\nAmount: ${amount}\nToken: ${tokenName}\nTime: ${time}`
            };

            // Send data to Discord webhook
            await axios.post(DISCORD_WEBHOOK_URL, message);
        }

        res.status(200).send('Transactions processed');
    } catch (error) {
        console.error('Error processing transactions:', error);
        res.status(500).send('Server error');
    }
});

// Extract necessary data from Helius transaction payload
function extractTransactionData(tx) {
    return {
        sender: tx.sender,
        receiver: tx.receiver,
        amount: tx.amount,
        tokenAddress: tx.tokenAddress,
        time: new Date(tx.timestamp * 1000).toLocaleString()
    };
}

// Function to get token name from Solana blockchain
async function getTokenName(tokenAddress) {
    const payload = {
        jsonrpc: "2.0",
        id: 1,
        method: "getTokenAccountBalance",
        params: [tokenAddress]
    };

    try {
        const response = await axios.post(SOLANA_RPC_URL, payload);
        return response.data.result.value.uiAmountString || "Unknown Token";
    } catch (error) {
        console.error('Error fetching token name:', error);
        return 'Unknown Token';
    }
}

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
