// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface ITicketNFT {
    struct TicketMetadata {
        string eventId;
        uint256 originalPrice;
        uint256 eventDate;
        bool isUsed;
    }
    function getTicketMetadata(uint256 tokenId) external view returns (TicketMetadata memory);
}

contract TicketMarketplace is ReentrancyGuard, Ownable {
    IERC721 public ticketNFT;
    ITicketNFT public ticketNFTMetadata;

    uint256 public platformFeePercent = 250;
    uint256 public royaltyPercent = 500;
    uint256 public maxResalePercent = 11000;
    uint256 constant PERCENT_BASE = 10000;

    struct Listing {
        address seller;
        uint256 price;
        bool isActive;
    }

    struct Escrow {
        address buyer;
        address seller;
        uint256 tokenId;
        uint256 amount;
        uint256 expiresAt;
        bool isCompleted;
        bool isRefunded;
    }

    mapping(uint256 => Listing) public listings;
    mapping(bytes32 => Escrow) public escrows;
    uint256 public escrowDuration = 15 minutes;

    event TicketListed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event ListingCancelled(uint256 indexed tokenId);
    event TicketSold(uint256 indexed tokenId, address indexed buyer, address indexed seller, uint256 price);
    event EscrowCreated(bytes32 indexed escrowId, uint256 indexed tokenId, address buyer, uint256 amount);
    event EscrowCompleted(bytes32 indexed escrowId);
    event EscrowRefunded(bytes32 indexed escrowId);

    constructor(address _ticketNFT) {
        ticketNFT = IERC721(_ticketNFT);
        ticketNFTMetadata = ITicketNFT(_ticketNFT);
    }

    function setTicketNFT(address _ticketNFT) external onlyOwner {
        ticketNFT = IERC721(_ticketNFT);
        ticketNFTMetadata = ITicketNFT(_ticketNFT);
    }

    function setPlatformFee(uint256 _feePercent) external onlyOwner {
        require(_feePercent <= 1000, "Fee too high");
        platformFeePercent = _feePercent;
    }

    function setMaxResalePercent(uint256 _maxPercent) external onlyOwner {
        require(_maxPercent >= 10000, "Must be at least 100%");
        maxResalePercent = _maxPercent;
    }

    function listTicket(uint256 tokenId, uint256 price) external {
        require(ticketNFT.ownerOf(tokenId) == msg.sender, "Not ticket owner");
        require(ticketNFT.isApprovedForAll(msg.sender, address(this)) || ticketNFT.getApproved(tokenId) == address(this), "Marketplace not approved");

        ITicketNFT.TicketMetadata memory metadata = ticketNFTMetadata.getTicketMetadata(tokenId);
        require(!metadata.isUsed, "Ticket already used");

        uint256 maxPrice = (metadata.originalPrice * maxResalePercent) / PERCENT_BASE;
        require(price <= maxPrice, "Price exceeds maximum resale price");

        listings[tokenId] = Listing({ seller: msg.sender, price: price, isActive: true });
        emit TicketListed(tokenId, msg.sender, price);
    }

    function cancelListing(uint256 tokenId) external {
