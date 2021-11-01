import _ from "lodash";
import { Server, Socket } from "socket.io";
import { createAdapter } from "socket.io-redis";
import { logger } from "./logs";
import { redisClient } from "./make-redis";
import { findMatch, cancelMatch, getMatch, findEloMatch } from "../services/use-cases";

export default function makeSockets(server, cors) {
  const io = new Server(server, { transports: ["polling"], cors, path: "/match/new" });
  const pubClient = redisClient.redis_client;
  if (!pubClient) {
    console.warn("Redis not initialized not found. Socket is not established");
    return;
  }
  const subClient = pubClient.duplicate();
  io.adapter(createAdapter({ pubClient, subClient }));
  const nsp = io.of("/match");

  if (nsp) {
    console.log("Successfully connected to sockets");
  }

  nsp.on("connection", (socket: Socket) => {
    socket.on("elo_matching", async (payload) => {
      logger.verbose("User started an Elo Match!");
      const match = await findEloMatch(payload);
      const status = _.get(match, "status");
      const elo_match_pool_id = _.get(match, "elo_match_pool_id");
      const socket_id = String(elo_match_pool_id);
      socket.join(socket_id);

      if (status === "matched") {
        const match_id = _.get(match, "match_id");
        if (!match_id) {
          return;
        }
        logger.verbose("Match found! Redirect user to their room now...");
        const match_details = await getMatch(match_id);
        nsp.to(socket_id).emit("matched", match_details);
      } else {
        nsp.to(socket_id).emit("waiting", elo_match_pool_id);
      }
    });

    socket.on("question_matching", async (payload) => {
      logger.verbose("User started a Question Match!");
      const match = await findMatch(payload);
      const status = _.get(match, "status");
      const match_id = _.get(match, "match_id");
      const socket_id = String(match_id);
      if (!match_id) {
        return;
      }
      socket.join(socket_id);
      if (status === "matched") {
        logger.verbose("Match found! Redirect user to their room now...");
        const match_details = await getMatch(match_id);
        nsp.to(socket_id).emit("matched", match_details);
      } else {
        nsp.to(socket_id).emit("waiting", match_id);
      }
    });

    socket.on("cancel", async (match_id) => {
      logger.verbose("Match is cancelling...", { match_id });
      const is_cancelled = await cancelMatch(match_id);
      if (is_cancelled) {
        nsp.in(match_id).socketsLeave(match_id);
      }
    });
  });
}
