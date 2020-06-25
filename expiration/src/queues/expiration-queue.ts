import Queue from "bull";
import { ExpirationCompletedPublisher } from "../events/expiration-completed-publisher";
import { redisWrapper } from "../redis-wrapper";

interface Payload {
  orderId: string;
}

const expirationQueue = new Queue<Payload>("order:expiration", {
  redis: {
    host: process.env.REDIS_HOST,
  },
});

expirationQueue.process(async (job) => {
  console.log("Processing expiration for order:", job.data.orderId);

  await new ExpirationCompletedPublisher(redisWrapper.publisher).publish({
    orderId: job.data.orderId,
  });
});

export { expirationQueue };
