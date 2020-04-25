import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";

describe("BlockPass Contracts", function () {
  let ticketNFT: Contract;
  let marketplace: Contract;
  let paymentEscrow: Contract;
  let owner: Signer;
  let seller: Signer;
  let buyer: Signer;
  let ownerAddress: string;
  let sellerAddress: string;
  let buyerAddress: string;

  beforeEach(async function () {
    [owner, seller, buyer] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
    sellerAddress = await seller.getAddress();
    buyerAddress = await buyer.getAddress();

    const PaymentEscrow = await ethers.getContractFactory("PaymentEscrow");
    paymentEscrow = await PaymentEscrow.deploy();
    await paymentEscrow.deployed();

    const TicketMarketplace = await ethers.getContractFactory("TicketMarketplace");
    marketplace = await TicketMarketplace.deploy(ethers.constants.AddressZero);
    await marketplace.deployed();

    const TicketNFT = await ethers.getContractFactory("TicketNFT");
    ticketNFT = await TicketNFT.deploy(marketplace.address);
    await ticketNFT.deployed();

    await marketplace.setTicketNFT(ticketNFT.address);
  });

  describe("TicketNFT", function () {
    it("Should mint a ticket", async function () {
      const tx = await ticketNFT.mintTicket(
        sellerAddress,
        "ipfs://QmTest123",
        "event-001",
        ethers.utils.parseEther("0.1"),
        Math.floor(Date.now() / 1000) + 86400
      );
      await tx.wait();

      expect(await ticketNFT.ownerOf(1)).to.equal(sellerAddress);
      expect(await ticketNFT.tokenURI(1)).to.equal("ipfs://QmTest123");

      const metadata = await ticketNFT.getTicketMetadata(1);
      expect(metadata.eventId).to.equal("event-001");
      expect(metadata.isUsed).to.equal(false);
    });

    it("Should batch mint tickets", async function () {
      const tokenURIs = ["ipfs://QmTest1", "ipfs://QmTest2", "ipfs://QmTest3"];
      const tx = await ticketNFT.batchMintTickets(
        sellerAddress,
        tokenURIs,
        "event-002",
        ethers.utils.parseEther("0.05"),
        Math.floor(Date.now() / 1000) + 86400
      );
      await tx.wait();

      expect(await ticketNFT.balanceOf(sellerAddress)).to.equal(3);
    });

    it("Should mark ticket as used", async function () {
      await ticketNFT.mintTicket(
        sellerAddress,
        "ipfs://QmTest",
        "event-003",
        ethers.utils.parseEther("0.1"),
        Math.floor(Date.now() / 1000) + 86400
      );

      await ticketNFT.connect(seller).useTicket(1);
      const metadata = await ticketNFT.getTicketMetadata(1);
      expect(metadata.isUsed).to.equal(true);
    });
  });

  describe("TicketMarketplace", function () {
    beforeEach(async function () {
      await ticketNFT.mintTicket(
        sellerAddress,
        "ipfs://QmTest",
        "event-001",
        ethers.utils.parseEther("0.1"),
        Math.floor(Date.now() / 1000) + 86400
      );
      await ticketNFT.connect(seller).setApprovalForAll(marketplace.address, true);
    });

    it("Should list a ticket for sale", async function () {
      const price = ethers.utils.parseEther("0.1");
      await marketplace.connect(seller).listTicket(1, price);

      const listing = await marketplace.getListing(1);
      expect(listing.seller).to.equal(sellerAddress);
      expect(listing.price).to.equal(price);
      expect(listing.isActive).to.equal(true);
    });

    it("Should not allow listing above max resale price", async function () {
      const price = ethers.utils.parseEther("0.2");
      await expect(marketplace.connect(seller).listTicket(1, price)).to.be.revertedWith("Price exceeds maximum resale price");
    });

    it("Should allow buying a listed ticket", async function () {
      const price = ethers.utils.parseEther("0.1");
      await marketplace.connect(seller).listTicket(1, price);
      await marketplace.connect(buyer).buyTicket(1, { value: price });

      expect(await ticketNFT.ownerOf(1)).to.equal(buyerAddress);
    });
  });

  describe("PaymentEscrow", function () {
    it("Should create a payment", async function () {
      const orderId = ethers.utils.formatBytes32String("order-001");
      const amount = ethers.utils.parseEther("0.1");

      const tx = await paymentEscrow.connect(buyer).createPayment(orderId, sellerAddress, { value: amount });
      const receipt = await tx.wait();

      const event = receipt.events?.find((e: any) => e.event === "PaymentCreated");
      expect(event).to.not.be.undefined;
    });

    it("Should complete a payment", async function () {
