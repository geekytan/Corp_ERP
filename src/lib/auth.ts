import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { Role, SessionUser } from "@/lib/types";
import { env } from "@/lib/env";
import { db } from "@/lib/db";

export const COOKIE_NAME = "corperp_token";
export const TOKEN_EXPIRY_SECONDS = 8 * 60 * 60; // 8 hours

const secretKey = new TextEncoder().encode(env.AUTH_SECRET);

export interface TokenPayload {
  sub: string;
  employeeId: string;
  role: Role;
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({
    employeeId: payload.employeeId,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secretKey);
}

export async function verifyToken(
  token: string
): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });
    if (!payload.sub || !payload.employeeId || !payload.role) {
      return null;
    }
    return {
      sub: payload.sub,
      employeeId: payload.employeeId as string,
      role: payload.role as Role,
    };
  } catch {
    return null;
  }
}

export async function setAuthCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: TOKEN_EXPIRY_SECONDS,
  });
}

export async function clearAuthCookie(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload || !payload.sub) return null;

  const user = await db.user.findUnique({
    where: { id: payload.sub },
    include: { employee: true },
  });

  if (!user || !user.isActive || !user.employee || user.employee.status === "INACTIVE") {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    employeeId: user.employee.id,
    name: `${user.employee.firstName} ${user.employee.lastName}`,
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
