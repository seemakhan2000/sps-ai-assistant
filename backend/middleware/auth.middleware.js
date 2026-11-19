
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const protect = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.sps_access_token;

  if (!token) {
    throw new AppError("Authentication required.", 401, "UNAUTHORIZED");
  }

  let decoded;

  try {
    decoded = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ["HS256"]
    });
  } catch {
    throw new AppError(
      "Your session has expired. Please sign in again.",
      401,
      "INVALID_TOKEN"
    );
  }

  const user = await User.findById(decoded.sub);

  if (!user || user.accountStatus !== "active") {
    throw new AppError(
      "Account access is unavailable.",
      403,
      "ACCOUNT_UNAVAILABLE"
    );
  }

  req.user = user;

  next();
});