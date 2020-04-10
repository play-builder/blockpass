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
        require(msg.value > 0, "Payment amount must be greater than 0");
        require(orderToPayment[orderId] == bytes32(0), "Payment already exists for this order");

        bytes32 paymentId = keccak256(abi.encodePacked(orderId, msg.sender, block.timestamp));

        payments[paymentId] = Payment({
            orderId: orderId,
            buyer: msg.sender,
            seller: seller,
            amount: msg.value,
            createdAt: block.timestamp,
            expiresAt: block.timestamp + defaultExpiration,
            status: PaymentStatus.PENDING
        });

        orderToPayment[orderId] = paymentId;
        emit PaymentCreated(paymentId, orderId, msg.sender, msg.value);
        return paymentId;
    }

    function completePayment(bytes32 paymentId) external nonReentrant {
        Payment storage payment = payments[paymentId];
        require(payment.buyer != address(0), "Payment does not exist");
        require(payment.status == PaymentStatus.PENDING, "Payment not pending");
        require(msg.sender == owner() || msg.sender == payment.seller, "Not authorized");

        payment.status = PaymentStatus.COMPLETED;

        uint256 platformFee = (payment.amount * platformFeePercent) / PERCENT_BASE;
        uint256 sellerAmount = payment.amount - platformFee;

        payable(payment.seller).transfer(sellerAmount);
        payable(owner()).transfer(platformFee);

        emit PaymentCompleted(paymentId, payment.orderId);
    }

    function refundPayment(bytes32 paymentId) external nonReentrant {
        Payment storage payment = payments[paymentId];
        require(payment.buyer != address(0), "Payment does not exist");
        require(payment.status == PaymentStatus.PENDING, "Payment not pending");
        require(msg.sender == owner() || msg.sender == payment.seller, "Not authorized");

        payment.status = PaymentStatus.REFUNDED;
