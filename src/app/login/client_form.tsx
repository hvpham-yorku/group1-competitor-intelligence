"use client"

import { signIn } from "next-auth/react";
import { redirect, useRouter } from "next/navigation";
import { FormEvent } from "react";

export default function Form(){
    const Router = useRouter();
    const HandleSubmit = async (e: FormEvent<HTMLFormElement>) =>{
        e.preventDefault();
        const FormInfo = new FormData(e.currentTarget);
        const Response = await signIn('credentials', {
            email: FormInfo.get("email"),
            password: FormInfo.get("password"),
            redirect: false,
        });
        console.log({Response});
        if(!Response?.error){
            Router.push("/");
            Router.refresh();
        }
    };
    return( 
        <div className="mx-auto max-w-md mt-10">
        <form onSubmit={HandleSubmit} className="flex flex-col gap-2 fg-white">
            <input name="email" className="border border-white" type="email"/>
            <input name="password" className="border border-white" type="password"/>
            <button type="submit" className="border border-white">Login</button>
        </form>
        <button onClick={()=>{redirect("/register")}}>Register</button>
        </div>
    );
}