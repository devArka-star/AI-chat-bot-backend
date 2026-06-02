// models/BotSettings.js
const mongoose = require('mongoose');

const BotSettingsSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    name: { type: String, default: 'ChatBot' },
    description: { type: String, default: 'Welcome!' },
    avatar: { type: String, default: null },
    language: { type: String, default: 'English' }
});

module.exports = mongoose.model('BotSettings', BotSettingsSchema);