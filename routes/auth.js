const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const User = require('../models/User');

// Configure disk storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png/;
        const isAllowed = allowedTypes.test(path.extname(file.originalname).toLowerCase()) && 
                          allowedTypes.test(file.mimetype);
        if (isAllowed) return cb(null, true);
        cb(new Error('Only images are allowed'));
    },
    limits: { fileSize: 2 * 1024 * 1024 }
});

// Registration Route
router.post('/register', upload.single('profileImage'), async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const userExists = await User.findOne({ email });
        
        if (userExists) {
            return res.status(400).json({ error: 'User already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ 
            name, email, password: hashedPassword, 
            profileImage: req.file ? `/uploads/${req.file.filename}` : '' 
        });

        await newUser.save();
        return res.status(201).json({ message: 'User registered successfully!' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// Login Route
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(400).json({ error: 'Invalid email' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid password' });
        }

        const token = jwt.sign({ id: user._id, name: user.name }, process.env.JWT_SECRET, { expiresIn: '24h' });
        
        return res.status(200).json({
            message: "Login successful",
            token,
            user: { id: user._id, name: user.name, email: user.email, profileImage: user.profileImage }
        });
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;