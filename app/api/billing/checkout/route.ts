import { NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { canonicalEmail, isOperatorEmail } from "@/lib/operators"
import { createRevolutCheckout } from "@/lib/revolut"

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
  try {
    const order = await createRevolutCheckout({ email, userId: a.userId, origin })
    return NextResponse.json(order)
  } catch (err) {
    const status = (err as Error & { status?: number }).status || 502
    return NextResponse.json({ error: (err as Error).message }, { status })
  }
}
