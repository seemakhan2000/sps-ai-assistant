
import { env } from "../config/env.js";

export function notFound(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.path}`,
    code: "ROUTE_NOT_FOUND"
  });
}

export function errorHandler(error, req, res, next) {
  let statusCode = error.statusCode || 500;
  let message = error.message || "An unexpected error occurred.";
  let code = error.code || "INTERNAL_ERROR";

  if (error.code === 11000) {
    statusCode = 409;
    message = "An account with this email already exists.";
    code = "DUPLICATE_RECORD";
  }

  if (error.name === "ValidationError") {
    statusCode = 400;
    message = "Invalid data provided.";
    code = "VALIDATION_ERROR";
  }

  if (error.name === "CastError") {
    statusCode = 400;
    message = "Invalid resource identifier.";
    code = "INVALID_ID";
  }

  if (env.NODE_ENV !== "production") {
    console.error(error);
  }

  res.status(statusCode).json({
    success: false,
    message:
      env.NODE_ENV === "production" && statusCode === 500
        ? "An internal server error occurred."
        : message,
    code,
    ...(env.NODE_ENV !== "production" && {
      stack: error.stack
    })
  });
}