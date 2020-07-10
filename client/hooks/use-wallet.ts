import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import buildClient from "../api/build-client";

interface User {
  id: string;
  walletAddress: string;
}

export const useWallet = () => {
  const [address, setAddress] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkCurrentUser = useCallback(async () => {
    try {
      const client = buildClient();
      const { data } = await client.get("/api/users/currentuser");
      if (data.currentUser) {
        setUser(data.currentUser);
        setAddress(data.currentUser.walletAddress);
      }
    } catch (err) {
      console.error("Failed to check current user:", err);
    }
  }, []);

  useEffect(() => {
    checkCurrentUser();
  }, [checkCurrentUser]);

  const connectWallet = async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      setError("Please install MetaMask to use this application");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const walletAddress = accounts[0].toLowerCase();

      const client = buildClient();
      const { data: nonceData } = await client.post("/api/users/nonce", {
        walletAddress,
      });

      const signer = provider.getSigner();
      const signature = await signer.signMessage(nonceData.message);

      const { data: authData } = await client.post("/api/users/wallet-auth", {
        walletAddress,
        signature,
      });

      setAddress(walletAddress);
      setUser(authData);
    } catch (err: any) {
      console.error("Failed to connect wallet:", err);
      setError(err.message || "Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      const client = buildClient();
      await client.post("/api/users/signout");
      setAddress(null);
      setUser(null);
    } catch (err) {
      console.error("Failed to sign out:", err);
    }
  };

  const signMessage = async (message: string): Promise<string> => {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("MetaMask not installed");
    }
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    return signer.signMessage(message);
  };

  return {
    address,
    user,
    isConnecting,
    error,
    connectWallet,
    disconnectWallet,
    signMessage,
  };
};

declare global {
  interface Window {
    ethereum?: any;
  }
}
