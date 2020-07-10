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
