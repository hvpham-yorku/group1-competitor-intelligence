import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import {compare} from 'bcrypt'
import { SqliteDB } from "../../database";
const handler = NextAuth({
    session: {
        strategy: 'jwt'
    },
    providers: [
        CredentialsProvider({
           
            credentials: {
            email: {},
            password: {}
            },
            async authorize(credentials, req) {
                //console.log(credentials?.email);
                const Response =  await new Promise((resolve, reject) => {
                                    SqliteDB.all(`SELECT * FROM users WHERE email = ?`, credentials?.email, function (err, rows) {
                                    if (err) {
                                        console.log(err);
                                        reject(err);
                                    }
                                    resolve(rows);
                                    });
                                    });
                //console.log({Response});
                const User = Response[0];
                const PasswordCorrect = await compare(credentials?.password || "", User.password);
                console.log({PasswordCorrect});
                if(PasswordCorrect){
                    return {
                        id: User.id,
                        email: User.email
                    }
                }
                //console.log({credentials});
                return null;
            }
        })
    ]
});

export {handler as GET, handler as POST}