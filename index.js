const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// --- CONFIGURATION ---
// Get these from your Twilio Console
const accountSid = "YOUR_SID_HERE"; // Don't put the real one yet
const authToken = "YOUR_TOKEN_HERE"; // Don't put the real one yet
const client = twilio(accountSid, authToken);

// Your Twilio WhatsApp Number (Sandbox or Verified)
const TWILIO_NUMBER = 'whatsapp:+14155238886'; 
// Your Personal WhatsApp Number (where you want to receive msgs)
const OWNER_NUMBER = 'whatsapp:+8801522134431'; 

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));

// Setup Socket.io (Connection to Website)
const io = new Server(server, {
  cors: {
    origin: "*", // Allow connections from your React website
    methods: ["GET", "POST"]
  }
});

// Store socket IDs to know who to reply to
// In production, use a Database (Redis/Mongo) instead of this variable
let activeUsers = {}; 

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('send_message', async (data) => {
    console.log(`Msg from Website (${socket.id}):`, data.text);
    
    // Save user mapping
    // We Map: "Owner's WhatsApp" <-> "Website User Socket ID"
    // Since we only have ONE owner, we can prepend the socketID to the message text
    // so the owner knows who sent it, or manage sessions properly.
    
    // Simple Strategy: Send message to Owner via Twilio
    try {
      await client.messages.create({
        body: `[WebUser]: ${data.text}`, // We prefix to know it's from web
        from: TWILIO_NUMBER,
        to: OWNER_NUMBER
      });
      // Store the socket ID as the "current active user" for simplicity in this demo
      activeUsers['last_active'] = socket.id;
    } catch (error) {
      console.error('Error sending to WhatsApp:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// --- WEBHOOK (Receives Replies from Your WhatsApp) ---
app.post('/whatsapp-webhook', (req, res) => {
  const messageBody = req.body.Body; // The text you replied
  const sender = req.body.From; // Your number

  console.log(`Reply from Owner (${sender}):`, messageBody);

  // Send this reply back to the Website User via Socket.io
  const targetSocketId = activeUsers['last_active'];
  
  if (targetSocketId) {
    io.to(targetSocketId).emit('receive_message', {
      text: messageBody,
      sender: 'agent'
    });
  } else {
    console.log("No active web user found to reply to.");
  }

  res.send('<Response></Response>'); // Reply to Twilio to say "Got it"
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
