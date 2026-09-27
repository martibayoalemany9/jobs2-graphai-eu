import { SignIn } from "@clerk/nextjs"

export default function SignInPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-bg p-6">
      <SignIn />
    </div>
  )
}
