import express, { Request, Response } from "express";
import { body } from "express-validator";
import { requireAuth, validateRequest, NotFoundError, NotAuthorizedError, BadRequestError } from "@blockpass/common";
import { Ticket } from "../models/ticket";
import { TicketCreatedPublisher, TicketUpdatedPublisher } from "../events";
import { redisWrapper } from "../redis-wrapper";

const router = express.Router();

router.get("/api/tickets", async (req, res) => { res.send(await Ticket.find({ orderId: undefined })); });
router.get("/api/tickets/:id", async (req, res) => { const t = await Ticket.findById(req.params.id); if (!t) throw new NotFoundError(); res.send(t); });

router.post("/api/tickets", requireAuth, [body("title").notEmpty(), body("price").isFloat({ gt: 0 })], validateRequest,
  async (req: Request, res: Response) => {
    const { title, price, eventDate, venue, description } = req.body;
    const ticket = Ticket.build({ title, price, userId: req.currentUser!.id, eventDate: eventDate ? new Date(eventDate) : undefined, venue, description });
    await ticket.save();
    await new TicketCreatedPublisher(redisWrapper.publisher).publish({ id: ticket.id, title: ticket.title, price: ticket.price, userId: ticket.userId, eventDate: ticket.eventDate?.toISOString(), venue: ticket.venue, description: ticket.description, ipfsHash: ticket.ipfsHash, version: ticket.version });
    res.status(201).send(ticket);
  }
);

router.put("/api/tickets/:id", requireAuth, [body("title").notEmpty(), body("price").isFloat({ gt: 0 })], validateRequest,
  async (req: Request, res: Response) => {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) throw new NotFoundError();
    if (ticket.orderId) throw new BadRequestError("Cannot edit a reserved ticket");
    if (ticket.userId !== req.currentUser!.id) throw new NotAuthorizedError();
    ticket.set({ title: req.body.title, price: req.body.price });
    await ticket.save();
    await new TicketUpdatedPublisher(redisWrapper.publisher).publish({ id: ticket.id, title: ticket.title, price: ticket.price, userId: ticket.userId, orderId: ticket.orderId, version: ticket.version });
    res.send(ticket);
  }
);

export { router as ticketRouter };
