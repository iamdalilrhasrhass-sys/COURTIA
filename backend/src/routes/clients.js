/**
 * Client Routes
 * /api/clients/*
 */

const express = require('express');
const clientController = require('../controllers/clientController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

// Toutes les routes clients requièrent l'authentification
router.use(verifyToken);

// CRUD
router.get('/', clientController.getAll);
router.post('/', clientController.create);
router.get('/search', clientController.search);
router.get('/:id', clientController.getById);
router.put('/:id', clientController.update);
router.delete('/:id', clientController.delete);

module.exports = router;
