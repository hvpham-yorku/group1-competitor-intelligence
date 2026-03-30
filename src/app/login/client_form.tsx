"use client"

import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { FormEvent, useState } from "react"
import { LayoutDashboard } from "lucide-react"

export default function Form() {
  const Router = useRouter()
  
  // Keep the login feedback inline so failed and successful sign-ins are visible
  // without leaving the page immediately.
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const HandleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    // Clear prior messages before attempting a new sign-in.
    setError(null)
    setSuccess(null)
    
    const FormInfo = new FormData(e.currentTarget)
    const Response = await signIn("credentials", {
      email: FormInfo.get("email"),
      password: FormInfo.get("password"),
      redirect: false,
    })
    
    console.log({ Response })
    
    if (Response?.error) {
      setError("Invalid email or password. Please try again.")
    } else {
      setSuccess("Login successful! Redirecting...")
      
      // Briefly surface the success state before the redirect takes over.
      setTimeout(() => {
        Router.push("/")
        Router.refresh()
      }, 1000)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-24 bg-grey-900 gap-6">
      <div className="flex items-center gap-2">
        <LayoutDashboard className="h-16 w-16 text-white" />
      </div>
      <h1 className="text-3xl font-semibold text-white">
        Welcome to CI-APP
      </h1>
      <div className="w-full max-w-md p-8 bg-background border border-grey-600 rounded-xl shadow-lg">
        <h2 className="text-2xl font-semibold tracking-tight mb-6 text-center">
          Login to your account
        </h2>
        {error && (
          <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500 text-red-500 text-sm text-center">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded bg-green-500/10 border border-green-500 text-green-500 text-sm text-center">
            {success}
          </div>
        )}

        <form onSubmit={HandleSubmit} className="flex flex-col gap-4">
          <input
            name="email"
            type="email"
            placeholder="Email"
            className="px-4 py-2 rounded-full border border-grey-600 bg-grey-900 text-white focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0"
            required
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            className="px-4 py-2 rounded-full border border-grey-600 bg-grey-700 text-white focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0"
            required
          />
          <button
            type="submit"
            className="bg-white hover:bg-gray-200 transition-colors text-black py-2 rounded-full font-medium"
          >
            Login
          </button>
        </form>
        <div className="mt-4 text-center text-muted-foreground">
          Don&apos;t have an account?{" "}
          <button
            onClick={() => Router.push("/register")}
            className="text-blue-400 hover:underline"
          >
            Register
          </button>
        </div>
      </div>
    </div>
  )
}
