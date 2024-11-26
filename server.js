const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

// Create an Express application
const app = express();

const SECRET_KEY = 'my_helius_secret_key_123123123!!!!';
// Discord Webhook URL
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1309187806459068496/XfUyEX0qfNCvqED3-ZysWB-MMpq8FiFCHkj-rUhfkPNvVxElXkLaW4dNgYnSYiU-IOn5';
const API_KEY = "ec874754-ef19-4f6f-976f-8090de3dae6b";
const NFT_INFO_URL = `https://api.helius.xyz/v0/nft-data?api-key=${API_KEY}`;
// Middleware to parse incoming JSON
app.use(bodyParser.json());

let flag = true;

app.post('/webhook', async (req, res) => {
  const authHeader = req.headers['authorization'];
  // console.log(JSON.stringify(req.body, null, 2));
  if (authHeader !== `${SECRET_KEY}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  let transactions;
  if(flag) transactions = req.body;
  else return

  flag = false;
  const processedMessage = await processTransactionData(transactions);
  await sendToDiscord(processedMessage);
  flag = true;
  return res.status(200).json({ message: 'Transaction data received and processing delayed' });
});


async function getTokenSymbol(mintaddress) {
  try {
    // Send a POST request to Helius API
    const response = await fetch('https://mainnet.helius-rpc.com/?api-key=' + API_KEY, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "jsonrpc": "2.0",
        "id": "text",
        "method": "getAsset",
        "params": {
          id: mintaddress
        }
      })
    });

    const data = await response.json();
    if (data && data.result && data.result.content && data.result.content.metadata) {
      // const tokenName = data.result.content.metadata.name;
      const tokenSymbol = data.result.content.metadata.symbol;
      // console.log(`Token Symbol: ${tokenSymbol}`);
      return tokenSymbol;
    } else {
      console.error('Error: Token metadata not found in the response.');
    }
  } catch (error) {
    console.error('Error fetching token metadata:', error);
  }
}

// Function to process transaction data
async function processTransactionData(data) {

  const {type, tokenTransfers, timestamp, signature, source, nativeTransfers} = data[0];
  let formattedTransactions = '';
  // console.log(JSON.stringify(transactions.tokenTransfers, null, 2));
  let general_timestamp = new Date(timestamp * 1000).toLocaleString();
  let sender, receiver, amount, tokenSymbol, token_name_from, token_name_to;
  if (type == "TRANSFER") {
    sender = nativeTransfers[0].fromUserAccount;
    receiver = nativeTransfers[0].toUserAccount;
    amount = nativeTransfers[0].amount/1000000000;
    tokenSymbol = "SOL";

    formattedTransactions += `
        Type: ${type}
        Timestamp: ${general_timestamp}
        Sender: ${sender}
        Receiver: ${receiver}
        Amount: ${amount}
        Token: ${tokenSymbol}
    `;
  }
  else if (type == "SWAP") {
    sender = tokenTransfers[0].fromUserAccount;
    if (data[0].events.swap.nativeOutput == null) {
      amount_from = tokenTransfers[0].tokenAmount;
      token_name_from = await getTokenSymbol(tokenTransfers[0].mint);
      amount_to = tokenTransfers[1].tokenAmount;
      token_name_to = await getTokenSymbol(tokenTransfers[1].mint);
    } else if(data[0].events.swap.nativeIntput == null) {
      amount_from = tokenTransfers[0].tokenAmount;
      token_name_from = await getTokenSymbol(tokenTransfers[0].mint);
      amount_to = tokenTransfers[1].tokenAmount;
      token_name_to = await getTokenSymbol(tokenTransfers[1].mint);
    } else {
      amount_from = data[0].events.swap.nativeInput.amount/1000000000;
      token_name_from = "SOL";
      amount_to = data[0].events.swap.nativeOutput.amount/1000000000;
      token_name_to = "SOL";
    } 
    

    formattedTransactions += `
        Type: ${type}
        Timestamp: ${general_timestamp}
        Wallet_Address: ${sender}
        From Amount: ${amount_from}
        Token: ${token_name_from}
        To Amount: ${amount_to}
        Token: ${token_name_to}
    `;
  } 
  else if (type == "NFT_SALE") {
    // console.log(JSON.stringify(data[0], null, 2));
    sender = data[0].events.nft.buyer;
    receiver = data[0].events.nft.seller;
    amount = data[0].events.nft.amount/1000000000;
    tokenSymbol = "SOL";
    // const nft_mint_address = data.events.nft.nfts[0].mint;
    // fetchNFTData(nft_mint_address);
    formattedTransactions += `
        Type: ${type}
        Timestamp: ${general_timestamp}
        NFT_Buyer: ${sender}
        NFT_Seller: ${receiver}
        Source: ${source}
        Price: ${amount}
        Token: ${tokenSymbol}
    `;
  }
  else {
    // console.log(JSON.stringify(data[0], null, 2));
    // sender = nativeTransfers[0].fromUserAccount;
    // receiver = nativeTransfers[0].toUserAccount;
    // amount = nativeTransfers[0].amount / ( 10^9 );
    // token_name = "SOL";
  }
  return formattedTransactions;
}


// async function fetchNftName(mint_address) {
//   const url = "https://api.helius.xyz/v0/assets";
//   console.log("asdasd:", mint_address);
//   const response = await fetch(url, {
//       method: "POST",
//       headers: {
//           "Content-Type": "application/json",
//           "x-api-key": API_KEY,
//       },
//       body: JSON.stringify({
//           method: "getAssets",
//           params: {
//               addresses: [mint_address],
//           },
//       }),
//   });

//   const data = await response.json();
//   console.log("response: ", data);
//   if (data.assets && data.assets.length > 0) {
//       const nftMetadata = data.assets[0];
//       console.log("NFT Name:", nftMetadata.name);
//       return nftMetadata.name;
//   } else {
//       console.error("NFT metadata not found for this mint address.");
//   }
// };


// async function fetchNFTData(mintAddress) {
//   try {
//     const response = await axios.post(NFT_INFO_URL, {
//       mintAccounts: [mintAddress]  // Pass the mint address in an array
//     });
//     console.log("res_data:", response);
//     const nftData = response.data[0];  // Assuming you only requested one NFT

//     if (nftData) {
//       console.log("NFT Name:", nftData.name);
//       console.log("Symbol:", nftData.symbol);
//       console.log("Collection:", nftData.collection?.name || "No collection");
//       console.log("Metadata URI:", nftData.metadata.uri);
//     } else {
//       console.log("No data found for this mint address.");
//     }
//   } catch (error) {
//     console.error("Error fetching NFT data:", error.response ? error.response.data : error.message);
//   }
// }

// async function fetchTransactionData(signature) {
//   const url = `https://mainnet.helius-rpc.com/?api-key=${API_KEY}`;
//   const requestBody = {
//     jsonrpc: "2.0",
//     id: "1",
//     method: "getTransaction",
//     params: [
//       signature,
//       {
//         maxSupportedTransactionVersion: 0,
//         encoding: "jsonParsed"
//       }
//     ]
//   };

//   try {
//     const response = await fetch(url, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(requestBody)
//     });

//     const data = await response.json();
    
//     // Extract token mint information
//     const tokenBalances = data.result.meta.postTokenBalances;
//     tokenBalances.forEach((balance) => {
//       console.log(`Token Mint Address: ${balance.mint}`);
//       console.log(`Owner: ${balance.owner}`);
//       console.log(`Token Amount: ${balance.uiTokenAmount.uiAmountString}`);
//     });

//   } catch (error) {
//     console.error("Error fetching transaction:", error);
//   }
// };

async function sendToDiscord(message) {
  console.log('Sending to Discord:', message);

  const fields = message.split("\n").filter(line => line.trim()).map(line => {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) return null;
    const name = line.substring(0, colonIndex).trim();
    const value = line.substring(colonIndex + 1).trim();
    return { name, value: value || "N/A", inline: false };
  }).filter(field => field !== null);

  const embedPayload = {
    embeds: [
      {
        title: "Transaction Notification",
        color: 5814783,
        fields: fields,
        footer: {
          text: "made by Almatbek",
        },
      },
    ],
  };

  try {
    const response = await axios.post(DISCORD_WEBHOOK_URL, embedPayload, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    console.log('Sent to Discord, status code:', response.status);
  } catch (error) {
    if (error.response && error.response.status === 429) {
      console.warn('Rate limited by Discord. Skipping this message.');
    } else {
      console.error('Error sending to Discord:', error.response ? error.response.data : error.message);
    }
  }
}

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

