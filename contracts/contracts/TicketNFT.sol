// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract TicketNFT is ERC721URIStorage, ERC721Enumerable, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    address public marketplaceAddress;

    struct TicketMetadata {
        string eventId;
        uint256 originalPrice;
        uint256 eventDate;
        bool isUsed;
    }

    mapping(uint256 => TicketMetadata) public ticketMetadata;
    mapping(string => uint256[]) public eventTickets;

    event TicketMinted(uint256 indexed tokenId, address indexed owner, string eventId, uint256 price);
    event TicketUsed(uint256 indexed tokenId);
    event MarketplaceUpdated(address indexed newMarketplace);

    constructor(address _marketplaceAddress) ERC721("BlockPass Ticket", "BPT") {
        marketplaceAddress = _marketplaceAddress;
    }

    function setMarketplaceAddress(address _marketplaceAddress) external onlyOwner {
        marketplaceAddress = _marketplaceAddress;
        emit MarketplaceUpdated(_marketplaceAddress);
    }

    function mintTicket(
        address recipient,
        string memory _tokenURI,
        string memory eventId,
        uint256 originalPrice,
        uint256 eventDate
    ) external returns (uint256) {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        _mint(recipient, newTokenId);
        _setTokenURI(newTokenId, _tokenURI);

        ticketMetadata[newTokenId] = TicketMetadata({
            eventId: eventId,
            originalPrice: originalPrice,
            eventDate: eventDate,
            isUsed: false
