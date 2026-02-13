"use client"

import { signIn } from "next-auth/react"
import { redirect, useRouter } from "next/navigation"
import { FormEvent } from "react"
import { LayoutDashboard } from "lucide-react"

export default function Form() {
  const Router = useRouter()

  const HandleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const FormInfo = new FormData(e.currentTarget)
    const Response = await signIn("credentials", {
      email: FormInfo.get("email"),
      password: FormInfo.get("password"),
      redirect: false,
    })
    console.log({ Response })
    if (!Response?.error) {
      Router.push("/")
      Router.refresh()
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
        <form onSubmit={HandleSubmit} className="flex flex-col gap-4">
          <input
            name="email"
            type="email"
            placeholder="Email"
            className="px-4 py-2 rounded-full border border-grey-600 bg-grey-900 text-white focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            className="px-4 py-2 rounded-full border border-grey-600 bg-grey-700 text-white focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0"
          />
          <button
            type="submit"
            className="bg-white hover:bg-gray-200 transition-colors text-black py-2 rounded-full font-medium"
          >
            Login
          </button>
        </form>
        <div className="mt-4 text-center text-muted-foreground">
          Don't have an account?{' '}
          <button
            onClick={() => redirect("/register")}
            className="text-blue-400 hover:underline"
          >
            Register
          </button>
        </div>
      </div>
    </div>
  )
}
