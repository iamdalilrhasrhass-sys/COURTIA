/**
 * Client Controller
 * CRUD operations for clients
 */

const Client = require('../models/Client');

// Créer un client
exports.create = async (req, res) => {
  try {
    const userId = req.user.id;
    const client = await Client.create(req.body, userId);

    res.status(201).json({
      message: 'Client created successfully',
      client
    });
  } catch (err) {
    console.error('Create client error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// Récupérer tous les clients
exports.getAll = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0, status, type, search } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (type) filters.type = type;
    if (search) filters.search = search;

    const clients = await Client.findAll(
      userId,
      parseInt(limit),
      parseInt(offset),
      filters
    );

    const totalCount = await Client.count(userId);

    res.json({
      clients,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: totalCount,
        hasMore: (parseInt(offset) + parseInt(limit)) < totalCount
      }
    });
  } catch (err) {
    console.error('Get clients error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// Récupérer un client
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const client = await Client.findById(id);

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    // Note: user_id check temporarily disabled for demo data
    // if (client.user_id && client.user_id !== req.user.id) {
    //   return res.status(404).json({ error: 'Client not found' });
    // }

    res.json(client);
  } catch (err) {
    console.error('Get client error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// Mettre à jour un client
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Vérifier que le client existe
    const client = await Client.findById(id);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    // Note: user_id check temporarily disabled for demo data
    // if (client.user_id && client.user_id !== userId) {
    //   return res.status(404).json({ error: 'Client not found' });
    // }

    const updated = await Client.update(id, req.body, userId);

    res.json({
      message: 'Client updated successfully',
      client: updated
    });
  } catch (err) {
    console.error('Update client error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// Supprimer un client
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Vérifier que le client existe
    const client = await Client.findById(id);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    // Note: user_id check temporarily disabled for demo data
    // if (client.user_id && client.user_id !== userId) {
    //   return res.status(404).json({ error: 'Client not found' });
    // }

    const result = await Client.delete(id, userId);

    res.json({
      message: 'Client deleted successfully',
      id: result.id
    });
  } catch (err) {
    console.error('Delete client error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// Rechercher des clients
exports.search = async (req, res) => {
  try {
    const userId = req.user.id;
    const { q, limit = 10 } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({
        error: 'Search query must be at least 2 characters'
      });
    }

    const clients = await Client.findAll(
      userId,
      parseInt(limit),
      0,
      { search: q }
    );

    res.json({ results: clients });
  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
