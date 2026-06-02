// models/Chat.js
const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
  user: { type: String, default: "Anonymous Visitor" },
  snippet: { type: String, required: true },
  messages: [
    {
      sender: { type: String, enum: ['user', 'bot'], required: true },
      text: { type: String, required: true },
      timestamp: { type: Date, default: Date.now }
    }
  ],
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Chat', ChatSchema);