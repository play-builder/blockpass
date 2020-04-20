import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const PaymentEscrow = await ethers.getContractFactory("PaymentEscrow");
  const paymentEscrow = await PaymentEscrow.deploy();
  await paymentEscrow.deployed();
  console.log("PaymentEscrow deployed to:", paymentEscrow.address);

  const TicketMarketplace = await ethers.getContractFactory("TicketMarketplace");
  const marketplace = await TicketMarketplace.deploy(ethers.constants.AddressZero);
  await marketplace.deployed();
  console.log("TicketMarketplace deployed to:", marketplace.address);

  const TicketNFT = await ethers.getContractFactory("TicketNFT");
  const ticketNFT = await TicketNFT.deploy(marketplace.address);
  await ticketNFT.deployed();
  console.log("TicketNFT deployed to:", ticketNFT.address);

  const setNFTTx = await marketplace.setTicketNFT(ticketNFT.address);
  await setNFTTx.wait();
  console.log("Marketplace linked to TicketNFT");

  const network = await ethers.provider.getNetwork();
  const deploymentDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }

  const addresses = {
    network: network.name,
    chainId: network.chainId,
    deployer: deployer.address,
    contracts: {
      TicketNFT: ticketNFT.address,
      TicketMarketplace: marketplace.address,
      PaymentEscrow: paymentEscrow.address,
    },
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(deploymentDir, `addresses-${network.chainId}.json`),
    JSON.stringify(addresses, null, 2)
  );

  console.log("\nDeployment complete!");
  console.log("Addresses saved to:", path.join(deploymentDir, `addresses-${network.chainId}.json`));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
