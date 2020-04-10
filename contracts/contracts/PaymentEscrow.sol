// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PaymentEscrow is ReentrancyGuard, Ownable {
    enum PaymentStatus { PENDING, COMPLETED, REFUNDED, EXPIRED }

    struct Payment {
        bytes32 orderId;
        address buyer;
        address seller;
        uint256 amount;
        uint256 createdAt;
        uint256 expiresAt;
        PaymentStatus status;
    }

    mapping(bytes32 => Payment) public payments;
    mapping(bytes32 => bytes32) public orderToPayment;

    uint256 public defaultExpiration = 15 minutes;
    uint256 public platformFeePercent = 250;
    uint256 constant PERCENT_BASE = 10000;

    event PaymentCreated(bytes32 indexed paymentId, bytes32 indexed orderId, address buyer, uint256 amount);
    event PaymentCompleted(bytes32 indexed paymentId, bytes32 indexed orderId);
    event PaymentRefunded(bytes32 indexed paymentId, bytes32 indexed orderId);
    event PaymentExpired(bytes32 indexed paymentId, bytes32 indexed orderId);

    function createPayment(bytes32 orderId, address seller) external payable nonReentrant returns (bytes32) {
