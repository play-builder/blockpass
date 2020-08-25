import express, { Request, Response } from "express";
import { body } from "express-validator";
import { randomBytes } from "crypto";
import jwt from "jsonwebtoken";
import { validateRequest, BadRequestError, currentUser } from "@blockpass/common";
import { User } from "../models/user";
import { WalletVerificationService } from "../services/wallet-verification";

const router = express.Router();

router.post("/api/users/nonce", [body("walletAddress").trim().notEmpty()], validateRequest,
  async (req: Request, res: Response) => {
    const { walletAddress } = req.body;
    if (!WalletVerificationService.isValidAddress(walletAddress)) {
      throw new BadRequestError("Invalid wallet address");
    }
    const normalizedAddress = WalletVerificationService.normalizeAddress(walletAddress);
    let user = await User.findOne({ walletAddress: normalizedAddress });
    if (!user) {
      user = User.build({ walletAddress: normalizedAddress });
      await user.save();
    }
    const message = WalletVerificationService.createSignMessage(normalizedAddress, user.nonce);
    res.status(200).send({ walletAddress: normalizedAddress, nonce: user.nonce, message });
  }
);

router.post("/api/users/wallet-auth", [body("walletAddress").trim().notEmpty(), body("signature").trim().notEmpty()], validateRequest,
  async (req: Request, res: Response) => {
    const { walletAddress, signature } = req.body;
    if (!WalletVerificationService.isValidAddress(walletAddress)) {
      throw new BadRequestError("Invalid wallet address");
    }
    const normalizedAddress = WalletVerificationService.normalizeAddress(walletAddress);
    const user = await User.findOne({ walletAddress: normalizedAddress });
    if (!user) throw new BadRequestError("Please request a nonce first");
    const message = WalletVerificationService.createSignMessage(normalizedAddress, user.nonce);
    if (!WalletVerificationService.verifySignature(message, signature, normalizedAddress)) {
      throw new BadRequestError("Invalid signature");
    }
    user.nonce = randomBytes(32).toString("hex");
    await user.save();
    const userJwt = jwt.sign({ id: user.id, walletAddress: user.walletAddress }, process.env.JWT_KEY!);
    req.session = { jwt: userJwt };
    res.status(200).send(user);
  }
);

router.get("/api/users/currentuser", currentUser, (req, res) => {
  res.send({ currentUser: req.currentUser || null });
});

router.post("/api/users/signout", (req, res) => {
  req.session = null;
  res.send({});
});

export { router as authRouter };
