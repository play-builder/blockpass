import { Listener, Channels, TicketCreatedEvent } from "@blockpass/common";
import { NFTMintingService } from "../services/nft-minting-service";
import { TicketMintedPublisher } from "./ticket-minted-publisher";
import { redisWrapper } from "../redis-wrapper";

export class TicketCreatedListener extends Listener<TicketCreatedEvent> {
  channel: Channels.TICKET_CREATED = Channels.TICKET_CREATED;

  private nftService: NFTMintingService;

  constructor(subscriber: any) {
    super(subscriber);
    this.nftService = new NFTMintingService(
      process.env.RINKEBY_RPC_URL!,
      process.env.MINTER_PRIVATE_KEY!,
      process.env.TICKET_NFT_ADDRESS!
    );
  }

  async onMessage(data: TicketCreatedEvent["data"]) {
    console.log("Received ticket:created event:", data.id);

    if (!data.ipfsHash) {
      console.log("No IPFS hash found, skipping mint");
      return;
    }
