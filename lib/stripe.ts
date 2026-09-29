import Stripe from "stripe"
import { SUB_PRICE_CENTS } from "./entitlement"

export const STRIPE_PLAN_NAME = "Graphai Jobs2"

export function stripeSecret(): string {
  return (
    process.env.STRIPE_SECRET_KEY ||
    process.env.STRIPE_GRAPHAI_EU ||
    process.env.STRIPE_TEST_SECRET_KEY ||
    ""
  )
}

export function stripeWebhookSecret(): string {
  return process.env.STRIPE_WEBHOOK_SECRET || ""
}

export function getStripe(): Stripe {
  const key = stripeSecret()
  if (!key) {
    const err = new Error("Stripe is not configured") as Error & { status?: number }
    err.status = 503
    throw err
  }
  return new Stripe(key)
}

function integrationId(): string {
  const suffix = Math.random().toString(36).slice(2, 10)
  return `jobs2chk_${suffix}`
}

export async function createStripeCheckout(opts: {
  email: string
  userId: string
  origin: string
}): Promise<{ url: string; id: string; mode: "stripe" }> {
  const stripe = getStripe()
  const origin = opts.origin.replace(/\/$/, "")
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: opts.email,
    client_reference_id: opts.userId,
    success_url: `${origin}/?view=settings&pay=stripe&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?view=settings&pay=cancel`,
    metadata: {
      email: opts.email,
      clerk_user_id: opts.userId,
      product: "jobs2_subscription",
    },
    subscription_data: {
      metadata: {
        email: opts.email,
        clerk_user_id: opts.userId,
        product: "jobs2_subscription",
      },
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: SUB_PRICE_CENTS,
          recurring: { interval: "month" },
          product_data: {
            name: STRIPE_PLAN_NAME,
            description: "€5 / month — full job listings on jobs2.graphai.eu",
          },
        },
      },
    ],
    integration_identifier: integrationId(),
  } as Stripe.Checkout.SessionCreateParams)
  if (!session.url || !session.id) {
    const err = new Error("Stripe Checkout has no url") as Error & { status?: number }
    err.status = 502
    throw err
  }
  return { url: session.url, id: session.id, mode: "stripe" }
}

export function sessionPaid(session: Stripe.Checkout.Session | null | undefined): boolean {
  if (!session) return false
  const pay = String(session.payment_status || "")
  const st = String(session.status || "")
  return pay === "paid" || pay === "no_payment_required" || st === "complete"
}

export async function retrieveCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session | null> {
  const id = String(sessionId || "").trim()
  if (!id || !stripeSecret()) return null
  try {
    return await getStripe().checkout.sessions.retrieve(id)
  } catch {
    return null
  }
}

export function verifyStripeEvent(rawBody: string, signature: string | null): Stripe.Event {
  const secret = stripeWebhookSecret()
  if (!secret) {
    const err = new Error("Stripe webhook is not configured") as Error & { status?: number }
    err.status = 503
    throw err
  }
  if (!signature) {
    const err = new Error("missing stripe-signature") as Error & { status?: number }
    err.status = 401
    throw err
  }
  return getStripe().webhooks.constructEvent(rawBody, signature, secret)
}
