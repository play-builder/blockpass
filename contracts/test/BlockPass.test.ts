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

