import { NextResponse } from "next/server";
import { registerUser } from "@/services/auth/register-user";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await registerUser({
      email: body?.email ?? "",
      password: body?.password ?? "",
      username: body?.username ?? "",
    });

    return NextResponse.json({ message: "success" });
  } catch (error) {
    console.error("POST /api/auth/register error:", error);

    if (error instanceof Error && error.message === "Missing required fields") {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "error" },
      { status: 500 }
    );
  }
}
