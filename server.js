const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path'); 
const fs = require('fs');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai'); 
const Chat = require('./models/Chat');
const BotSettings = require('./models/BotSettings');
const authRoutes = require('./routes/auth'); 

dotenv.config();

// DEBUG: Verify if API Key is loaded
console.log("Checking API Key:", process.env.GEMINI_API_KEY ? "✅ Loaded" : "❌ MISSING");

const app = express();

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, `bot-${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });

app.use(cors());
app.use(express.json());

// Initialize Gemini with the correct model ID
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('🚀 Connected to MongoDB Atlas'))
  .catch((err) => console.error('❌ Database connection failure:', err));

app.use('/api/auth', authRoutes);

// --- Bot Settings Routes (Same as before) ---
app.get('/api/bot-settings/:userId', async (req, res) => {
    try {
        const settings = await BotSettings.findOne({ userId: req.params.userId });
        res.json(settings || { name: 'ChatBot', description: 'Welcome!', avatar: null, language: 'English' });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.put('/api/bot-settings', async (req, res) => {
    try {
        const { userId, name, description, language } = req.body;
        await BotSettings.updateOne({ userId }, { $set: { userId, name, description, language } }, { upsert: true });
        res.status(200).json({ message: "Settings saved" });
    } catch (err) { res.status(500).json({ error: 'Save failed' }); }
});

app.post('/api/bot-settings/avatar', upload.single('avatar'), async (req, res) => {
    try {
        const { userId } = req.body;
        const avatarPath = `/uploads/${req.file.filename}`;
        await BotSettings.updateOne({ userId }, { $set: { avatar: avatarPath } }, { upsert: true });
        res.json({ avatarPath });
    } catch (err) { res.status(500).json({ error: 'Upload failed' }); }
});

// --- Chat Routes (Same as before) ---
app.get('/api/recent-chats/:userId', async (req, res) => {
    try {
        const chats = await Chat.find({ user: req.params.userId }).sort({ updatedAt: -1 });
        res.json(chats);
    } catch (err) { res.status(500).json({ error: 'History fetch failed' }); }
});

app.get('/api/recent-chats/details/:chatId', async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.chatId);
        if (!chat) return res.status(404).json({ error: "Chat not found" });
        res.json(chat);
    } catch (err) { res.status(500).json({ error: 'Failed to fetch chat details' }); }
});

app.post('/api/chats', async (req, res) => {
  const { userId } = req.body;
  try {
    const newChat = new Chat({
      user: userId || "Anonymous Visitor",
      snippet: "New conversation...",
      messages: [{ sender: 'bot', text: 'Hello! How can I help you today?' }]
    });
    const savedChat = await newChat.save();
    res.status(201).json(savedChat);
  } catch (error) {
    res.status(500).json({ error: 'Failed to initialize session' });
  }
});

// --- Gemini AI Chat (Updated for better reliability) ---
app.post('/api/chat', async (req, res) => {
  const { message, chatId } = req.body;
  if (!message) return res.status(400).json({ error: "No message provided" });

  try {
      const result = await model.generateContent(message);
      const reply = await result.response.text();

      if (chatId) {
        await Chat.findByIdAndUpdate(chatId, {
            $push: { messages: { $each: [{ sender: 'user', text: message }, { sender: 'bot', text: reply }] } },
            snippet: message.substring(0, 30),
            updatedAt: new Date()
        });
      }
      res.json({ reply });
  } catch (error) {
      console.error("AI Engine Error:", error);
      res.status(500).json({ error: 'Failed to communicate with AI Engine' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🤖 Jarvis Backend listening on port ${PORT}`);
});
