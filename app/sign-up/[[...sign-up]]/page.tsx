import { SignUp } from "@clerk/nextjs"

export default function SignUpPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-bg p-6">
      <SignUp />
    </div>
  )
}
