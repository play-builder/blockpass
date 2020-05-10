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
