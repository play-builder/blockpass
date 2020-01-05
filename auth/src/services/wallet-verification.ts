import { ethers } from "ethers";

export class WalletVerificationService {
  static createSignMessage(walletAddress: string, nonce: string): string {
    return `Welcome to BlockPass!\n\nPlease sign this message to verify your wallet ownership.\n\nWallet: ${walletAddress}\nNonce: ${nonce}`;
  }

  static verifySignature(message: string, signature: string, expectedAddress: string): boolean {
    try {
      const recoveredAddress = ethers.utils.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
    } catch (error) {
      return false;
    }
