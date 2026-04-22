import type { Request, Response } from "express";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { OAuth2Client } from "google-auth-library";
import { db } from "../db/db";
import { users } from "../db/schema";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_TTL = "24h";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

type JwtUserInfo = {
  id: string;
  name: string;
  email: string;
};

type VerifiedGoogleUser = {
  email: string;
  name: string;
};

function signJwt(userInfo: JwtUserInfo): string {
  const secret = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("ACCESS_TOKEN_SECRET is not configured");
  }

  return jwt.sign({ userInfo }, secret, {
    expiresIn: ACCESS_TOKEN_TTL,
  });
}

async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, BCRYPT_ROUNDS);
}

async function verifyPassword(plainPassword: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, passwordHash);
}

async function verifyGoogleToken(idToken: string): Promise<VerifiedGoogleUser> {
  if (!GOOGLE_CLIENT_ID || !googleClient) {
    throw new Error("GOOGLE_CLIENT_ID is not configured");
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  const email = payload?.email?.trim().toLowerCase();
  const name = payload?.name?.trim();

  if (!payload?.sub || !email || !payload.email_verified) {
    throw new Error("invalid google token");
  }

  return {
    email,
    name: name || email,
  };
}

export async function signup(req: Request, res: Response) {
  try {
    const { username, email, password } = req.body as {
      username?: string;
      email?: string;
      password?: string;
    };

    const normalizedEmail = email?.trim().toLowerCase();

    if (!username || !normalizedEmail || !password) {
      return res
        .status(400)
        .json({ message: "username, email, and password are required" });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: "password must be at least 8 characters" });
    }

    const existing = await db
      .select({ userId: users.userId })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({ message: "email is already in use" });
    }

    const created = await db
      .insert(users)
      .values({
        name: username,
        email: normalizedEmail,
        password_hash: await hashPassword(password),
      })
      .returning({
        userId: users.userId,
        name: users.name,
        email: users.email,
      });

    const createdUser = created[0];
    const token = signJwt({
      id: createdUser.userId,
      name: createdUser.name,
      email: createdUser.email,
    });

    return res.status(201).json({
      message: "signup successful",
      token,
    });
  } catch (error) {
    console.error("signup error:", error);
    return res.status(500).json({ message: "failed to sign up" });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res
        .status(400)
        .json({ message: "email and password are required" });
    }

    const found = await db
      .select({
        userId: users.userId,
        name: users.name,
        email: users.email,
        passwordHash: users.password_hash,
      })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    const user = found[0];
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return res.status(401).json({ message: "invalid email or password" });
    }

    const token = signJwt({
      id: user.userId,
      name: user.name,
      email: user.email,
    });

    return res.status(200).json({
      message: "login successful",
      token,
    });
  } catch (error) {
    console.error("login error:", error);
    return res.status(500).json({ message: "failed to log in" });
  }
}
export async function glogin(req: Request, res: Response) {
  try {
    const { gtoken } = req.body as {
      gtoken?: string;
    };

    if (!gtoken) {
      return res
        .status(400)
        .json({ message: "google token required" });
    }

    const guser = await verifyGoogleToken(gtoken);

    const [found] = await db
      .select({
        userId: users.userId,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(eq(users.email, guser.email))
      .limit(1);

    if (found) {
      const token = signJwt({
        id: found.userId,
        name: found.name,
        email: found.email,
      });
      return res.status(200).json({
        message: "login successful",
        token,
      });
    }

    const created = await db
      .insert(users)
      .values({
        name: guser.name,
        email: guser.email,
        password_hash: await hashPassword(randomUUID()),
      })
      .returning({
        userId: users.userId,
        name: users.name,
        email: users.email,
      });

    const createdUser = created[0];
    const token = signJwt({
      id: createdUser.userId,
      name: createdUser.name,
      email: createdUser.email,
    });

    return res.status(201).json({
      message: "google sign up successful",
      token,
    });
  }
  catch (error) {
    console.error("google login error:", error);

    if (error instanceof Error && error.message === "GOOGLE_CLIENT_ID is not configured") {
      return res.status(500).json({ message: "google login is not configured" });
    }

    if (error instanceof Error && error.message === "invalid google token") {
      return res.status(401).json({ message: "invalid google account" });
    }

    return res.status(401).json({ message: "failed to verify google login" });
  }
}
