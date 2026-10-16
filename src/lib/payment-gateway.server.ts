import type { PaymentOutcome } from "@/lib/payment-types";

export type PaymentMode = "test" | "live";

export type RequestResult = {
  /** Gateway token identifying this transaction (e.g. Zarinpal "authority"). */
  authority: string;
  /** Where to send the customer. null = no redirect needed (test gateway). */
  redirectUrl: string | null;
};

export type VerifyResult = {
  outcome: PaymentOutcome;
  /** Gateway's own reference (e.g. Zarinpal ref_id). Empty when not successful. */
  gatewayRef: string;
};

/**
 * Two-step gateway contract used by real Iranian gateways (Zarinpal, IDPay, ...):
 *  1. request(): register the amount with the gateway, get an authority + redirect URL.
 *  2. verify(): AFTER the customer returns, ask the gateway server-to-server whether
 *     the money was really captured. Only verify() decides the outcome — never the browser.
 */
export interface PaymentGateway {
  id: string;
  mode: PaymentMode;
  request(input: { paymentId: string; amount: number; callbackUrl: string }): Promise<RequestResult>;
  verify(input: { authority: string; amount: number; testOutcome?: PaymentOutcome | undefined }): Promise<VerifyResult>;
}

/**
 * TEST gateway. No money moves. The tester picks the outcome on the payment page.
 * Every payment it settles is stored with mode = 'test' and must never be counted as real revenue.
 */
const testGateway: PaymentGateway = {
  id: "test",
  mode: "test",
  async request({ paymentId }) {
    return { authority: `TEST-${paymentId}`, redirectUrl: null };
  },
  async verify({ testOutcome }) {
    const outcome = testOutcome ?? "failed";
    return {
      outcome,
      gatewayRef:
        outcome === "success"
          ? `TEST-${Math.random().toString(36).slice(2, 10).toUpperCase()}`
          : "",
    };
  },
};

/**
 * Returns the active gateway. A live gateway is used only when its credentials are configured;
 * none is configured yet, so the app always runs in clearly labelled test mode.
 */
export function getPaymentGateway(): PaymentGateway {
  return testGateway;
}
