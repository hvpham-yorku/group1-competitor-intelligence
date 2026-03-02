import { compare } from "bcrypt";
import { findUserByEmail } from "@/persistence/users-repository";

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
};

export async function authenticateUser(input: {
  email?: string;
  password?: string;
}): Promise<AuthenticatedUser | null> {
  const email = clean(input.email).toLowerCase();
  const password = clean(input.password);

  if (!email || !password) {
    return null;
  }

  const foundUser = await findUserByEmail(email);
  if (!foundUser) {
    return null;
  }

  const isPasswordCorrect = await compare(password, foundUser.password);
  if (!isPasswordCorrect) {
    return null;
  }

  return {
    id: String(foundUser.id),
    name: foundUser.username,
    email: foundUser.email,
  };
}
