
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import { env } from "../config/env.js";
import Session from "../models/Session.js";

export function initializeSockets(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.FRONTEND_URL,
      credentials: true,
      methods: ["GET", "POST"]
    },
    maxHttpBufferSize: 1e6
  });

  io.use(async (socket, next) => {
    try {
      const cookie = socket.handshake.headers.cookie || "";

      const token = cookie
        .split(";")
        .map((item) => item.trim())
        .find((item) => item.startsWith("sps_access_token="))
        ?.split("=")
        .slice(1)
        .join("=");

      if (!token) {
        return next(new Error("Authentication required."));
      }

      const decoded = jwt.verify(
        decodeURIComponent(token),
        env.JWT_SECRET,
        { algorithms: ["HS256"] }
      );

      socket.userId = decoded.sub;

      next();
    } catch {
      next(new Error("Invalid real-time authentication."));
    }
  });

  io.on("connection", (socket) => {
    socket.on("session:join", async (payload, callback) => {
      try {
        const sessionId = payload?.sessionId;

        if (!mongoose.isValidObjectId(sessionId)) {
          return callback?.({
            success: false,
            message: "Invalid session."
          });
        }

        const session = await Session.findOne({
          _id: sessionId,
          userId: socket.userId,
          state: "live"
        });

        if (!session) {
          return callback?.({
            success: false,
            message: "Live session not found."
          });
        }

        const room = `session:${session._id}`;

        await socket.join(room);

        callback?.({
          success: true,
          message: "Connected to session."
        });

      } catch {
        callback?.({
          success: false,
          message: "Unable to join session."
        });
      }
    });

    socket.on("disconnect", () => {
      // Session records remain on the server.
      // A temporary disconnect must not end a session.
    });
  });

  return io;
}