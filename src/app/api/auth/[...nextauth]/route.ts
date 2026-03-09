import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { authenticateUser } from "@/services/auth/authenticate-user";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        return authenticateUser({
          email: credentials?.email,
          password: credentials?.password,
        });
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = String(user.id);
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        const sessionUser = session.user as Record<string, unknown>;
        sessionUser.id = token.sub;
      }

      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
