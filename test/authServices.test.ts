/**
 * @jest-environment node
 */
import { authenticateUser } from "@/services/auth/authenticate-user";
import { registerUser } from "@/services/auth/register-user";

const mockInsertUser = jest.fn();
const mockFindUserByEmail = jest.fn();
const mockHash = jest.fn();
const mockCompare = jest.fn();

jest.mock("@/persistence/users-repository", () => ({
  insertUser: (...args: unknown[]) => mockInsertUser(...args),
  findUserByEmail: (...args: unknown[]) => mockFindUserByEmail(...args),
}));

jest.mock("bcrypt", () => ({
  hash: (...args: unknown[]) => mockHash(...args),
  compare: (...args: unknown[]) => mockCompare(...args),
}));

describe("auth services", () => {
  beforeEach(() => {
    mockInsertUser.mockReset();
    mockFindUserByEmail.mockReset();
    mockHash.mockReset();
    mockCompare.mockReset();
  });

  test("registerUser hashes password and inserts normalized email", async () => {
    mockHash.mockResolvedValue("hashed-password");

    await registerUser({
      email: " Test@Example.com ",
      password: "secret",
      username: "tester",
    });

    expect(mockHash).toHaveBeenCalledWith("secret", 10);
    expect(mockInsertUser).toHaveBeenCalledWith({
      email: "test@example.com",
      passwordHash: "hashed-password",
      username: "tester",
    });
  });

  test("registerUser rejects missing fields", async () => {
    await expect(
      registerUser({
        email: "",
        password: "secret",
        username: "tester",
      })
    ).rejects.toThrow("Missing required fields");
  });

  test("authenticateUser returns mapped user on valid credentials", async () => {
    mockFindUserByEmail.mockResolvedValue({
      id: 5,
      email: "user@example.com",
      password: "stored-hash",
      username: "User Name",
    });
    mockCompare.mockResolvedValue(true);

    const result = await authenticateUser({
      email: " user@example.com ",
      password: "secret",
    });

    expect(mockFindUserByEmail).toHaveBeenCalledWith("user@example.com");
    expect(mockCompare).toHaveBeenCalledWith("secret", "stored-hash");
    expect(result).toEqual({
      id: "5",
      name: "User Name",
      email: "user@example.com",
    });
  });

  test("authenticateUser returns null for invalid credentials", async () => {
    mockFindUserByEmail.mockResolvedValue(null);

    const result = await authenticateUser({
      email: "missing@example.com",
      password: "secret",
    });

    expect(result).toBeNull();
    expect(mockCompare).not.toHaveBeenCalled();
  });
});
