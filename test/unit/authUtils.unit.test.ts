/**
 * @jest-environment node
 */
import { getExistingUserIdFromSession, getUserIdFromSession } from "@/app/api/auth/auth-utils";

const mockFindUserById = jest.fn();

jest.mock("@/persistence/users-repository", () => ({
  findUserById: (...args: unknown[]) => mockFindUserById(...args),
}));

describe("auth utils", () => {
  beforeEach(() => {
    mockFindUserById.mockReset();
  });

  test("getUserIdFromSession parses numeric and string ids", () => {
    expect(getUserIdFromSession({ user: { id: 7 } })).toBe(7);
    expect(getUserIdFromSession({ user: { id: "8" } })).toBe(8);
  });

  test("getUserIdFromSession returns 0 for invalid sessions", () => {
    expect(getUserIdFromSession(null)).toBe(0);
    expect(getUserIdFromSession({})).toBe(0);
    expect(getUserIdFromSession({ user: { id: "abc" } })).toBe(0);
  });

  test("getExistingUserIdFromSession returns 0 when user no longer exists", async () => {
    mockFindUserById.mockResolvedValue(null);

    await expect(
      getExistingUserIdFromSession({ user: { id: "11" } })
    ).resolves.toBe(0);

    expect(mockFindUserById).toHaveBeenCalledWith(11);
  });

  test("getExistingUserIdFromSession returns persisted user id", async () => {
    mockFindUserById.mockResolvedValue({
      id: 22,
      email: "user@example.com",
      password: "hash",
      username: "user",
    });

    await expect(
      getExistingUserIdFromSession({ user: { id: "22" } })
    ).resolves.toBe(22);
  });
});
