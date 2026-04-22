export function notFound(_req, res) {
  res.status(404).json({ message: "Route not found" });
}

export function errorHandler(error, _req, res, _next) {
  res.status(500).json({
    message: error.message || "Internal server error"
  });
}
