import mongoose from "mongoose";
import { updateIfCurrentPlugin } from "mongoose-update-if-current";

interface TicketAttrs { title: string; price: number; userId: string; eventDate?: Date; venue?: string; description?: string; }
interface TicketDoc extends mongoose.Document { title: string; price: number; userId: string; version: number; orderId?: string; tokenId?: string; ipfsHash?: string; isMinted: boolean; eventDate?: Date; venue?: string; description?: string; }
interface TicketModel extends mongoose.Model<TicketDoc> { build(attrs: TicketAttrs): TicketDoc; }
