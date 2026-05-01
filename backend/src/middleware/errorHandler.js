/**
 * Error Handler Middleware
 */

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Known errors
  if (err.status) {
    return res.status(err.status).json({
      success: false,
      error: err.name,
      message: err.message,
      field: err.field || null
    });
  }

  // Database errors
  if (err.code === '23505') {
    const field = err.constraint || '';
    const msg = field.includes('email')
      ? 'Cette adresse email est déjà utilisée.'
      : 'Cette ressource existe déjà.';
    return res.status(409).json({
      success: false,
      error: 'ConflictError',
      message: msg
    });
  }

  // Default server error
  res.status(500).json({
    success: false,
    error: 'InternalServerError',
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
};

module.exports = errorHandler;
