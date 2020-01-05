import { ethers } from "ethers";

export class WalletVerificationService {
  static createSignMessage(walletAddress: string, nonce: string): string {
