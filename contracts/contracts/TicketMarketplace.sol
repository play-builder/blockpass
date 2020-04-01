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
