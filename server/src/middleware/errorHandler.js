function errorHandler(err, req, res, next) {
  console.error("Error:", err.message);
  console.error(err.stack);

  const status = err.statusCode || 500;
  res.status(status).json({
    error: status === 500 ? "Internal server error" : err.message,
  });
}

module.exports = { errorHandler };
