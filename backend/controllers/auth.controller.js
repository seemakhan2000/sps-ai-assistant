
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import User from "../models/User.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const cookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE === "true",
  sameSite: env.COOKIE_SAME_SITE,
  path: "/",
  maxAge: 24 * 60 * 60 * 1000
};

function createToken(userId) {
  return jwt.sign(
    {},
    env.JWT_SECRET,
    {
      subject: userId.toString(),
      expiresIn: env.JWT_EXPIRES_IN,
      algorithm: "HS256"
    }
  );
}

function setAuthCookie(res, token) {
  res.cookie("sps_access_token", token, cookieOptions);
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    theme: user.theme,
    emailVerified: user.emailVerified,
    accountStatus: user.accountStatus
  };
}

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await User.findOne({
    email: normalizedEmail
  });

  if (existingUser) {
    throw new AppError(
      "An account with this email already exists.",
      409,
      "EMAIL_ALREADY_EXISTS"
    );
  }

  const passwordHash = await bcrypt.hash(
    password,
    env.BCRYPT_ROUNDS
  );

  const user = await User.create({
    name,
    email: normalizedEmail,
    passwordHash
  });

  const token = createToken(user._id);

  setAuthCookie(res, token);

  res.status(201).json({
    success: true,
    message: "Your SPS account has been created.",
    data: {
      user: publicUser(user)
    }
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({
    email: email.toLowerCase().trim()
  }).select("+passwordHash");

  if (!user) {
    throw new AppError(
      "Invalid email or password.",
      401,
      "INVALID_CREDENTIALS"
    );
  }

  const passwordMatches = await bcrypt.compare(
    password,
    user.passwordHash
  );

  if (!passwordMatches || user.accountStatus !== "active") {
    throw new AppError(
      "Invalid email or password.",
      401,
      "INVALID_CREDENTIALS"
    );
  }

  const token = createToken(user._id);

  setAuthCookie(res, token);

  res.json({
    success: true,
    message: "Welcome back to SPS AI Assistant.",
    data: {
      user: publicUser(user)
    }
  });
});

export const logout = asyncHandler(async (req, res) => {
  res.clearCookie("sps_access_token", {
    ...cookieOptions,
    maxAge: undefined,
    expires: new Date(0)
  });

  res.json({
    success: true,
    message: "You have been signed out."
  });
});

export const getMe = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      user: publicUser(req.user)
    }
  });
});