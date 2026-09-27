import { NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { canonicalEmail, isOperatorEmail } from "@/lib/operators"
import { createRevolutOrder } from "@/lib/revolut"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const a = await auth()
  if (!a.userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const user = await currentUser()
  const email = canonicalEmail(user?.primaryEmailAddress?.emailAddress || "")
  if (isOperatorEmail(email)) {
    return NextResponse.json({ url: null, operator: true })
  }
  const origin = new URL(req.url).origin
  try {
    const order = await createRevolutOrder({ email, userId: a.userId, origin })
    return NextResponse.json(order)
  } catch (err) {
    const status = (err as Error & { status?: number }).status || 502
    return NextResponse.json({ error: (err as Error).message }, { status })
  }
}
