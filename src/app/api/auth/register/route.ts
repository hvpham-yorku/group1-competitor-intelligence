import { NextResponse } from "next/server";
import {hash} from "bcrypt"
import {SqliteDB} from "../../database"

export async function POST(reguest: Request){
    try{
        const {email, password, username} = await reguest.json();
        console.log({email, password, username});

        const HashedPassword = await hash(password, 10);
        const Response = await SqliteDB.serialize(()=>{
            SqliteDB.run(`INSERT INTO users(email,password, username) VALUES(?, ?, ?)`, [email, HashedPassword, username]);
        });
    }catch(e){
        console.log({ e });
    }
    return NextResponse.json({message: "success"});
}