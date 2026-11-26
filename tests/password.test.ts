import { describe, expect, it } from "vitest";
import { generatePassword, hashPassword, verifyPassword } from "@/lib/auth/password";
import { ChangePasswordInput, UserInput } from "@/types/forms";

describe("passwords", () => {
  it("hashes with a random salt and verifies", async () => {
    const a = await hashPassword("Secret-123");
    const b = await hashPassword("Secret-123");
    expect(a).not.toBe(b);
    expect(a).not.toContain("Secret-123");
    expect(await verifyPassword("Secret-123", a)).toBe(true);
    expect(await verifyPassword("secret-123", a)).toBe(false);
    expect(await verifyPassword("x", "")).toBe(false);
  });
  it("generates readable passwords", () => {
    expect(generatePassword()).toMatch(/^[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/);
  });
});

describe("user and password forms", () => {
  it("accepts usernames and emails as the sign-in name", () => {
    expect(UserInput.parse({ email: "Ahmed.H", name: "Ahmed", role: "Admin" }).email).toBe("ahmed.h");
    expect(UserInput.safeParse({ email: "a@qaswarah.com", name: "Ahmed", role: "Viewer" }).success).toBe(true);
    expect(UserInput.safeParse({ email: "a b", name: "Ahmed", role: "Viewer" }).success).toBe(false);
  });
  it("requires matching new passwords of 8+ characters", () => {
    expect(ChangePasswordInput.safeParse({ current: "x", next: "short", confirm: "short" }).success).toBe(false);
    expect(ChangePasswordInput.safeParse({ current: "x", next: "long-enough", confirm: "different!" }).success).toBe(false);
    expect(ChangePasswordInput.safeParse({ current: "x", next: "long-enough", confirm: "long-enough" }).success).toBe(true);
  });
});
