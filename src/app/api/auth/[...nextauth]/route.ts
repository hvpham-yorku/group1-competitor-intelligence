import NextAuth, {NextAuthOptions} from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import {compare} from 'bcrypt'
import { SqliteDB } from "../../database";

export const authOptions: NextAuthOptions = {
  // Use JWT for sessions instead of database sessions
  session: {
    strategy: "jwt",
  },

  // We are using a credentials provider package (email + password)
  providers: [
    CredentialsProvider({
      credentials: {
        email: {},
        password: {},
      },

      // This runs when someone tries to log in
      async authorize(credentials) {
        // Get the user from the database using their email
        const userRows: any[] = await new Promise((resolve, reject) => {
          SqliteDB.all(
            `SELECT * FROM users WHERE email = ?`,
            credentials?.email,
            (error, rows) => {
              if (error) {
                reject(error);
              } else {
                resolve(rows || []);
              }
            }
          );
        });

        const foundUser = userRows[0];

        // If no user was found, stop login
        if (!foundUser) {
          return null;
        }

        // Compare the entered password with the hashed password
        const isPasswordCorrect = await compare(
          credentials?.password || "",
          foundUser.password
        );

        // If password does not match, stop login
        if (!isPasswordCorrect) {
          return null;
        }

        // If everything is valid, return basic user info
        return {
          id: String(foundUser.id),
          email: foundUser.email,
        };
      },
    }),
  ],

  // Callbacks allow us to customize JWT and session data
  callbacks: {
    async jwt({ token, user }) {
      // When user logs in, attach their id to the token
      if (user && user.id) {
        token.sub = String(user.id);
      }

      return token;
    },

    async session({ session, token }) {
      // Add the user id from the token into the session
      if (session.user && token && token.sub) {
        (session.user as any).id = token.sub;
      }

      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };