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
    return res.status(409).json({
      success: false,
      error: 'ConflictError',
      message: 'Resource already exists'
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
