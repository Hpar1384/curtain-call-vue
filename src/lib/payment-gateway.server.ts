import type { PaymentOutcome } from "@/lib/payment-types";

export type ChargeRequest = {
  bookingId: string;
  amount: number;
  /** Test mode only: which outcome the sandbox gateway should simulate. */
  simulate: PaymentOutcome;
};

export type ChargeResult = {
  outcome: PaymentOutcome;
  providerReference: string;
};

/**
 * Payment abstraction. A real gateway (Zarinpal, Stripe, ...) can implement the
 * same interface later without touching routes, server functions or the DB layer.
 */
export interface PaymentGateway {
  id: string;
  charge(request: ChargeRequest): Promise<ChargeResult>;
}

const mockGateway: PaymentGateway = {
  id: "mock",
  async charge({ simulate }) {
    // Sandbox: no network call, the caller decides the simulated outcome.
    await new Promise((r) => setTimeout(r, 300));
    return {
      outcome: simulate,
      providerReference: `MOCKGW-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
    };
  },
};

export function getPaymentGateway(): PaymentGateway {
  return mockGateway;
}
