import { hash } from "bcrypt";
import { insertUser } from "@/persistence/users-repository";

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function registerUser(input: {
  email: string;
  password: string;
  username: string;
}): Promise<void> {
  const email = clean(input.email).toLowerCase();
  const password = clean(input.password);
  const username = clean(input.username);

  if (!email || !password || !username) {
    throw new Error("Missing required fields");
  }

  const passwordHash = await hash(password, 10);

  await insertUser({
    email,
    passwordHash,
    username,
  });
}
