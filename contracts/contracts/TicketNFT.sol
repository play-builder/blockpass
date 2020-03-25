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
        });

        eventTickets[eventId].push(newTokenId);

        if (marketplaceAddress != address(0)) {
            setApprovalForAll(marketplaceAddress, true);
        }

        emit TicketMinted(newTokenId, recipient, eventId, originalPrice);
        return newTokenId;
    }

    function batchMintTickets(
        address recipient,
        string[] memory tokenURIs,
        string memory eventId,
        uint256 originalPrice,
        uint256 eventDate
    ) external returns (uint256[] memory) {
        uint256[] memory tokenIds = new uint256[](tokenURIs.length);

        for (uint256 i = 0; i < tokenURIs.length; i++) {
            _tokenIds.increment();
            uint256 newTokenId = _tokenIds.current();

            _mint(recipient, newTokenId);
            _setTokenURI(newTokenId, tokenURIs[i]);

            ticketMetadata[newTokenId] = TicketMetadata({
                eventId: eventId,
                originalPrice: originalPrice,
                eventDate: eventDate,
                isUsed: false
            });

            eventTickets[eventId].push(newTokenId);
            tokenIds[i] = newTokenId;
            emit TicketMinted(newTokenId, recipient, eventId, originalPrice);
        }

        return tokenIds;
    }

    function useTicket(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender || msg.sender == owner(), "Not authorized");
        require(!ticketMetadata[tokenId].isUsed, "Ticket already used");
        ticketMetadata[tokenId].isUsed = true;
        emit TicketUsed(tokenId);
    }

    function getTicketMetadata(uint256 tokenId) external view returns (TicketMetadata memory) {
        require(_exists(tokenId), "Token does not exist");
        return ticketMetadata[tokenId];
    }

    function getEventTickets(string memory eventId) external view returns (uint256[] memory) {
        return eventTickets[eventId];
    }

    function getTicketsByOwner(address owner) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory tokens = new uint256[](balance);
        for (uint256 i = 0; i < balance; i++) {
            tokens[i] = tokenOfOwnerByIndex(owner, i);
        }
        return tokens;
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721Enumerable, ERC721) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
