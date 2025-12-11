require('dotenv').config(); // Load the .env file

const express = require('express');
const app = express();
const port = 3000;

// Use the variables from the .env file
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

// Check if keys are loaded (Optional, for debugging)
if (!accountSid || !authToken) {
  console.error("Error: Twilio keys are missing from .env file");
}

const client = require('twilio')(accountSid, authToken);

app.get('/', (req, res) => {
  res.send('WhatsApp Bridge is running!');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});