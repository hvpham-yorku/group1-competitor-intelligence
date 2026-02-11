import { getServerSession } from "next-auth";
import Form from "./client_form";
import { redirect } from "next/navigation";


export default async function RegisterPage(){
   
    const Session = await getServerSession();
    if(Session){
        redirect("/");
    }
    return (
        <Form/>
    );
}