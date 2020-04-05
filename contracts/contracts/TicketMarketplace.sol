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
        require(listings[tokenId].seller == msg.sender, "Not the seller");
        require(listings[tokenId].isActive, "Listing not active");
        listings[tokenId].isActive = false;
        emit ListingCancelled(tokenId);
    }

    function buyTicket(uint256 tokenId) external payable nonReentrant {
        Listing memory listing = listings[tokenId];
        require(listing.isActive, "Listing not active");
        require(msg.value >= listing.price, "Insufficient payment");

        listings[tokenId].isActive = false;

        uint256 platformFee = (listing.price * platformFeePercent) / PERCENT_BASE;
        uint256 royalty = (listing.price * royaltyPercent) / PERCENT_BASE;
        uint256 sellerAmount = listing.price - platformFee - royalty;

        ticketNFT.safeTransferFrom(listing.seller, msg.sender, tokenId);
        payable(listing.seller).transfer(sellerAmount);
        payable(owner()).transfer(platformFee + royalty);

        if (msg.value > listing.price) {
            payable(msg.sender).transfer(msg.value - listing.price);
        }

        emit TicketSold(tokenId, msg.sender, listing.seller, listing.price);
    }

    function createEscrow(uint256 tokenId) external payable nonReentrant returns (bytes32) {
        Listing memory listing = listings[tokenId];
        require(listing.isActive, "Listing not active");
        require(msg.value >= listing.price, "Insufficient payment");

        bytes32 escrowId = keccak256(abi.encodePacked(tokenId, msg.sender, block.timestamp));
        escrows[escrowId] = Escrow({
            buyer: msg.sender,
            seller: listing.seller,
            tokenId: tokenId,
            amount: listing.price,
            expiresAt: block.timestamp + escrowDuration,
            isCompleted: false,
            isRefunded: false
        });

        listings[tokenId].isActive = false;
        emit EscrowCreated(escrowId, tokenId, msg.sender, listing.price);
        return escrowId;
    }

    function completeEscrow(bytes32 escrowId) external nonReentrant {
        Escrow storage escrow = escrows[escrowId];
        require(escrow.buyer != address(0), "Escrow does not exist");
        require(!escrow.isCompleted && !escrow.isRefunded, "Escrow already settled");
        require(msg.sender == escrow.buyer || msg.sender == owner(), "Not authorized");

        escrow.isCompleted = true;

        uint256 platformFee = (escrow.amount * platformFeePercent) / PERCENT_BASE;
        uint256 royalty = (escrow.amount * royaltyPercent) / PERCENT_BASE;
        uint256 sellerAmount = escrow.amount - platformFee - royalty;

        ticketNFT.safeTransferFrom(escrow.seller, escrow.buyer, escrow.tokenId);
        payable(escrow.seller).transfer(sellerAmount);
        payable(owner()).transfer(platformFee + royalty);

        emit EscrowCompleted(escrowId);
    }

    function refundEscrow(bytes32 escrowId) external nonReentrant {
        Escrow storage escrow = escrows[escrowId];
        require(escrow.buyer != address(0), "Escrow does not exist");
        require(!escrow.isCompleted && !escrow.isRefunded, "Escrow already settled");
        require(block.timestamp >= escrow.expiresAt || msg.sender == owner(), "Escrow not expired");

        escrow.isRefunded = true;
        listings[escrow.tokenId].isActive = true;
        payable(escrow.buyer).transfer(escrow.amount);
        emit EscrowRefunded(escrowId);
    }

    function getListing(uint256 tokenId) external view returns (Listing memory) {
        return listings[tokenId];
    }

    function getEscrow(bytes32 escrowId) external view returns (Escrow memory) {
        return escrows[escrowId];
    }
}
