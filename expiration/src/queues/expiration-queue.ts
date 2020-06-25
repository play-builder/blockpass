import Queue from "bull";
import { ExpirationCompletedPublisher } from "../events/expiration-completed-publisher";
import { redisWrapper } from "../redis-wrapper";

interface Payload {
  orderId: string;
}

const expirationQueue = new Queue<Payload>("order:expiration", {
  redis: {
    host: process.env.REDIS_HOST,
