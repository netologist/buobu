/**
 * Unit tests for the register() function in src/lib/auth/service.ts.
 *
 * Specifically covers the M6 (Coupons) changes:
 *  - apply_campaign_benefit RPC is called after consume_campaign_code
 *  - stripe_promotion_code_id is stashed in localStorage when present
 *  - Absence of stripe_promotion_code_id results in no localStorage write
 *
 * The supabase mock is set up globally in src/test/setup.ts.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { supabase } from "@/lib/supabase";
import { STORAGE_KEYS } from "@/lib/constants";
import { makeSupabaseUser } from "@/test/mocks/supabase";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_EMAIL = "newuser@example.com";
const TEST_PASSWORD = "Password123!";
const VALID_CODE = "INVITE01";
const VALID_REFERRAL_CODE = "ABCD1234";

function setupHappyPath(promoCodeId: string | null = null) {
  const mockUser = makeSupabaseUser({ id: "new-user-id", email: TEST_EMAIL });

  // validate_campaign_code → true
  // consume_campaign_code → null
  // apply_campaign_benefit → { stripe_promotion_code_id: promoCodeId }
  vi.mocked(supabase.rpc)
    .mockResolvedValueOnce({ data: true, error: null } as any) // validate_campaign_code
    .mockResolvedValueOnce({ data: null, error: null } as any) // consume_campaign_code
    .mockResolvedValueOnce({
      // apply_campaign_benefit
      data: promoCodeId ? { stripe_promotion_code_id: promoCodeId } : null,
      error: null,
    } as any);

  vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
    data: { user: mockUser, session: null },
    error: null,
  } as any);

  return mockUser;
}

function setupReferralHappyPath() {
  const mockUser = makeSupabaseUser({ id: "new-user-id", email: TEST_EMAIL });

  // validate_campaign_code → false (not a campaign code)
  // validate_referral_code → true
  // use_referral_code → { ok: true }
  // apply_campaign_benefit → null (no campaign benefit for referral codes)
  vi.mocked(supabase.rpc)
    .mockResolvedValueOnce({ data: false, error: null } as any) // validate_campaign_code
    .mockResolvedValueOnce({ data: true, error: null } as any) // validate_referral_code
    .mockResolvedValueOnce({ data: { ok: true }, error: null } as any) // use_referral_code
    .mockResolvedValueOnce({ data: null, error: null } as any); // apply_campaign_benefit

  vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
    data: { user: mockUser, session: null },
    error: null,
  } as any);

  return mockUser;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("register()", () => {
  // Import after mocks are set up (lazy require keeps the mock active).
  let register: (
    email: string,
    password: string,
    code: string,
  ) => Promise<unknown>;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("../service");
    register = mod.register;
    vi.mocked(supabase.rpc).mockReset();
    vi.mocked(supabase.auth.signUp).mockReset();
  });

  // ── Validation ────────────────────────────────────────────────────────────

  it("throws when campaign code is empty", async () => {
    await expect(register(TEST_EMAIL, TEST_PASSWORD, "")).rejects.toThrow(
      "Invite code is required",
    );
  });

  it("throws when campaign code is whitespace only", async () => {
    await expect(register(TEST_EMAIL, TEST_PASSWORD, "   ")).rejects.toThrow(
      "Invite code is required",
    );
  });

  it("throws when campaign code is shorter than 6 characters", async () => {
    await expect(register(TEST_EMAIL, TEST_PASSWORD, "AB12")).rejects.toThrow(
      "6-20 characters",
    );
  });

  it("throws when campaign code contains invalid characters", async () => {
    await expect(
      register(TEST_EMAIL, TEST_PASSWORD, "INVITE!"),
    ).rejects.toThrow("6-20 characters");
  });

  it("normalises campaign code to upper case before validation", async () => {
    vi.mocked(supabase.rpc)
      .mockResolvedValueOnce({ data: false, error: null } as any) // validate_campaign_code
      .mockResolvedValueOnce({ data: false, error: null } as any); // validate_referral_code
    await expect(
      register(TEST_EMAIL, TEST_PASSWORD, "invite01"),
    ).rejects.toThrow("Invalid or expired invite code");
    // The first RPC call (validate_campaign_code) should have received the uppercased code.
    const validateCampaignCall = vi
      .mocked(supabase.rpc)
      .mock.calls.find(([name]) => name === "validate_campaign_code");
    expect(validateCampaignCall![1]).toMatchObject({ p_code: "INVITE01" });
  });

  it("throws when validate_campaign_code returns false", async () => {
    vi.mocked(supabase.rpc)
      .mockResolvedValueOnce({ data: false, error: null } as any) // validate_campaign_code
      .mockResolvedValueOnce({ data: false, error: null } as any); // validate_referral_code
    await expect(
      register(TEST_EMAIL, TEST_PASSWORD, VALID_CODE),
    ).rejects.toThrow("Invalid or expired invite code");
  });

  // ── apply_campaign_benefit RPC ─────────────────────────────────────────────

  it("calls apply_campaign_benefit RPC after consume_campaign_code", async () => {
    setupHappyPath();
    await register(TEST_EMAIL, TEST_PASSWORD, VALID_CODE);

    const rpcs = vi.mocked(supabase.rpc).mock.calls.map((c) => c[0]);
    const consumeIdx = rpcs.indexOf("consume_campaign_code");
    const applyIdx = rpcs.indexOf("apply_campaign_benefit");

    expect(applyIdx).toBeGreaterThan(-1);
    expect(applyIdx).toBeGreaterThan(consumeIdx);
  });

  it("passes correct params to apply_campaign_benefit", async () => {
    setupHappyPath();
    await register(TEST_EMAIL, TEST_PASSWORD, VALID_CODE);

    const applyCall = vi
      .mocked(supabase.rpc)
      .mock.calls.find(([name]) => name === "apply_campaign_benefit");
    expect(applyCall).toBeDefined();
    expect(applyCall![1]).toEqual({ p_code: VALID_CODE });
  });

  // ── localStorage — stripe_promotion_code_id ────────────────────────────────

  it("stores stripe_promotion_code_id in localStorage when present", async () => {
    setupHappyPath("promo_123abc");
    await register(TEST_EMAIL, TEST_PASSWORD, VALID_CODE);
    expect(localStorage.getItem(STORAGE_KEYS.PENDING_PROMO)).toBe(
      "promo_123abc",
    );
  });

  it("does NOT write to localStorage when stripe_promotion_code_id is absent", async () => {
    setupHappyPath(null);
    await register(TEST_EMAIL, TEST_PASSWORD, VALID_CODE);
    expect(localStorage.getItem(STORAGE_KEYS.PENDING_PROMO)).toBeNull();
  });

  it("does NOT write to localStorage when apply_campaign_benefit returns null", async () => {
    setupHappyPath(null);
    await register(TEST_EMAIL, TEST_PASSWORD, VALID_CODE);
    expect(localStorage.getItem(STORAGE_KEYS.PENDING_PROMO)).toBeNull();
  });

  // ── Happy path: returns user ───────────────────────────────────────────────

  it("returns a User with correct id and email", async () => {
    setupHappyPath();
    const user = (await register(TEST_EMAIL, TEST_PASSWORD, VALID_CODE)) as {
      id: string;
      email: string;
    };
    expect(user.id).toBe("new-user-id");
    expect(user.email).toBe(TEST_EMAIL);
  });

  // ── Referral code path ─────────────────────────────────────────────────────

  it("accepts a valid referral code when campaign validation fails", async () => {
    setupReferralHappyPath();
    const user = (await register(
      TEST_EMAIL,
      TEST_PASSWORD,
      VALID_REFERRAL_CODE,
    )) as { id: string; email: string };
    expect(user.id).toBe("new-user-id");
  });

  it("calls use_referral_code (not consume_campaign_code) for referral codes", async () => {
    setupReferralHappyPath();
    await register(TEST_EMAIL, TEST_PASSWORD, VALID_REFERRAL_CODE);

    const rpcs = vi.mocked(supabase.rpc).mock.calls.map((c) => c[0]);
    expect(rpcs).toContain("use_referral_code");
    expect(rpcs).not.toContain("consume_campaign_code");
  });

  it("throws when both validate_campaign_code and validate_referral_code return false", async () => {
    vi.mocked(supabase.rpc)
      .mockResolvedValueOnce({ data: false, error: null } as any)
      .mockResolvedValueOnce({ data: false, error: null } as any);
    await expect(
      register(TEST_EMAIL, TEST_PASSWORD, VALID_REFERRAL_CODE),
    ).rejects.toThrow("Invalid or expired invite code");
  });

  // ── signUp error propagation ───────────────────────────────────────────────

  it("throws when supabase.auth.signUp returns an error", async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: true,
      error: null,
    } as any);
    vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: "Email already registered", code: "23505" },
    } as any);

    await expect(
      register(TEST_EMAIL, TEST_PASSWORD, VALID_CODE),
    ).rejects.toMatchObject({
      message: "Email already registered",
    });
  });
});
