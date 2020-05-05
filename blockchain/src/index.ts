import { redisWrapper } from "./redis-wrapper";
import { TicketCreatedListener } from "./events/ticket-created-listener";

const start = async () => {
  console.log("Starting blockchain service...");

  if (!process.env.REDIS_HOST) {
    throw new Error("REDIS_HOST must be defined");
