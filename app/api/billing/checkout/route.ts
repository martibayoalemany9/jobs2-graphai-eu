import { NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { canonicalEmail, isOperatorEmail } from "@/lib/operators"
import { createRevolutCheckout, revolutSecret } from "@/lib/revolut"
import { createStripeCheckout, stripeSecret } from "@/lib/stripe"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const a = await auth()
  if (!a.userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const user = await currentUser()
  const email = canonicalEmail(user?.primaryEmailAddress?.emailAddress || "")
  if (isOperatorEmail(email)) {
    return NextResponse.json({ url: null, operator: true })
  }
  const proto = req.headers.get("x-forwarded-proto") || "https"
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || new URL(req.url).host
  const origin = `${proto}://${host}`
  const body = (await req.json().catch(() => ({}))) as { provider?: string }
  const want = String(body.provider || "").toLowerCase()
  const preferStripe = want === "stripe" || (want !== "revolut" && Boolean(stripeSecret()))
  try {
    if (preferStripe && stripeSecret()) {
      const order = await createStripeCheckout({ email, userId: a.userId, origin })
      return NextResponse.json(order)
    }
    if (revolutSecret()) {
      const order = await createRevolutCheckout({ email, userId: a.userId, origin })
      return NextResponse.json(order)
    }
    const err = new Error("Payment is not configured") as Error & { status?: number }
    err.status = 503
    throw err
  } catch (err) {
    const status = (err as Error & { status?: number }).status || 502
    return NextResponse.json({ error: (err as Error).message }, { status })
  }
}
