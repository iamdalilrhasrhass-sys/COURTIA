/**
 * Auth Routes
 * /api/auth/*
 */

const express = require('express');
const authController = require('../controllers/authController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes
router.post('/verify', verifyToken, authController.verify);
router.post('/refresh', authController.refresh);

module.exports = router;
