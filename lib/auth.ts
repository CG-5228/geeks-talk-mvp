import { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      authorization: {
        params: { prompt: "consent", access_type: "offline", response_type: "code" },
      },
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, _req) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await db.user.findUnique({ where: { email: credentials.email } });
        if (!user || !user.hashedPassword) return null;
        const valid = await verifyPassword(credentials.password, user.hashedPassword);
        if (!valid) return null;
        const safeName = user.username ?? user.name ?? user.email ?? 'User';
        const safeImage = user.image ?? null;
        return {
          id: user.id,
          name: safeName,
          email: user.email,
          image: safeImage,
        } as any;
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        (token as any).id = (user as any).id;
        token.name = user.name;
        token.email = user.email;
        (token as any).image = (user as any).image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = (token as any).id;
        session.user.name = token.name || session.user.name;
        session.user.email = token.email || session.user.email;
        session.user.image = (token as any).image || session.user.image;
      }
      return session;
    },
  },
  pages: {
    signIn: '/signin',
  },
};


