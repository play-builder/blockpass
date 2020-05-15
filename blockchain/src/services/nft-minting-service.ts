import { ethers } from "ethers";

const TICKET_NFT_ABI = [
  "function mintTicket(address recipient, string memory tokenURI, string memory eventId, uint256 originalPrice, uint256 eventDate) external returns (uint256)",
  "function batchMintTickets(address recipient, string[] memory tokenURIs, string memory eventId, uint256 originalPrice, uint256 eventDate) external returns (uint256[] memory)",
  "function useTicket(uint256 tokenId) external",
  "function getTicketMetadata(uint256 tokenId) external view returns (tuple(string eventId, uint256 originalPrice, uint256 eventDate, bool isUsed))",
  "function getTicketsByOwner(address owner) external view returns (uint256[] memory)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function tokenURI(uint256 tokenId) external view returns (string memory)",
  "event TicketMinted(uint256 indexed tokenId, address indexed owner, string eventId, uint256 price)",
  "event TicketUsed(uint256 indexed tokenId)",
];

export class NFTMintingService {
  private provider: ethers.providers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contract: ethers.Contract;

  constructor(rpcUrl: string, privateKey: string, contractAddress: string) {
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.contract = new ethers.Contract(
      contractAddress,
      TICKET_NFT_ABI,
      this.wallet
    );
  }

  async mintTicket(
    recipient: string,
    tokenURI: string,
    eventId: string,
    originalPrice: string,
    eventDate: number
  ): Promise<{ tokenId: string; transactionHash: string }> {
    const priceInWei = ethers.utils.parseEther(originalPrice);

    const tx = await this.contract.mintTicket(
      recipient,
      tokenURI,
      eventId,
      priceInWei,
      eventDate
    );

    const receipt = await tx.wait();

    const event = receipt.events?.find(
      (e: any) => e.event === "TicketMinted"
    );

    if (!event) {
      throw new Error("TicketMinted event not found");
    }

    return {
      tokenId: event.args.tokenId.toString(),
      transactionHash: receipt.transactionHash,
    };
  }

  async batchMintTickets(
    recipient: string,
    tokenURIs: string[],
    eventId: string,
    originalPrice: string,
    eventDate: number
  ): Promise<{ tokenIds: string[]; transactionHash: string }> {
    const priceInWei = ethers.utils.parseEther(originalPrice);

    const tx = await this.contract.batchMintTickets(
      recipient,
      tokenURIs,
      eventId,
      priceInWei,
      eventDate
    );

    const receipt = await tx.wait();

    const events = receipt.events?.filter(
      (e: any) => e.event === "TicketMinted"
    );

    const tokenIds = events?.map((e: any) => e.args.tokenId.toString()) || [];

    return {
      tokenIds,
      transactionHash: receipt.transactionHash,
    };
  }

  async useTicket(tokenId: string): Promise<string> {
    const tx = await this.contract.useTicket(tokenId);
    const receipt = await tx.wait();
    return receipt.transactionHash;
  }

  async getTicketMetadata(tokenId: string): Promise<{
    eventId: string;
