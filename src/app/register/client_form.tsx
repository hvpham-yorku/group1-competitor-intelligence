"use client"

import { redirect } from "next/navigation";
import { FormEvent } from "react";

export default function Form(){
    const HandleSubmit = async (e: FormEvent<HTMLFormElement>) =>{
        e.preventDefault();
        const FormInfo = new FormData(e.currentTarget);
        const Response = await fetch("/api/auth/register", {
            method: "POST",
            body: JSON.stringify({
                email: FormInfo.get("email"),
                password: FormInfo.get("password"),
                username: FormInfo.get("username")
            }),
        });
        redirect("/login");
    };
    return(
        <div className="mx-auto max-w-md mt-10">
        <form onSubmit={HandleSubmit} className="flex flex-col gap-2 fg-white">
            <input name="email" placeholder="username@example.com" className="border border-white" type="email"/>
            <input name="username" placeholder="username" className="border border-white" type="username"/>
            <input name="password" placeholder="password" className="border border-white" type="password"/>
            <button type="submit" className="border border-white">Register</button>
        </form>
        <button onClick={()=>{redirect("/login")}}>Login</button>
        </div>
    );
}