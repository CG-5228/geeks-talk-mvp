import { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

// Debug: Log environment variables in development
if (process.env.NODE_ENV === 'development') {

  console.log('GOOGLE_CLIENT_ID value:', process.env.GOOGLE_CLIENT_ID?.substring(0, 10) + '...');

}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
  // Explicitly set the base URL for production
  ...(process.env.NODE_ENV === 'production' && {
    url: process.env.NEXTAUTH_URL || 'https://geekstalk.org',
  }),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile"
        },
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
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
          domain: process.env.AUTH_COOKIE_DOMAIN || (process.env.NODE_ENV === 'production' ? '.geekstalk.org' : undefined),
        secure: process.env.NODE_ENV === 'production',
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        sameSite: 'lax',
        path: '/',
          domain: process.env.AUTH_COOKIE_DOMAIN || (process.env.NODE_ENV === 'production' ? '.geekstalk.org' : undefined),
        secure: process.env.NODE_ENV === 'production',
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
          domain: process.env.AUTH_COOKIE_DOMAIN || (process.env.NODE_ENV === 'production' ? '.geekstalk.org' : undefined),
        secure: process.env.NODE_ENV === 'production',
      },
    },
    pkceCodeVerifier: {
      name: `next-auth.pkce.code_verifier`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
          domain: process.env.AUTH_COOKIE_DOMAIN || (process.env.NODE_ENV === 'production' ? '.geekstalk.org' : undefined),
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 15, // 15 minutes
      },
    },
    state: {
      name: `next-auth.state`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
          domain: process.env.AUTH_COOKIE_DOMAIN || (process.env.NODE_ENV === 'production' ? '.geekstalk.org' : undefined),
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 15, // 15 minutes
      },
    },
    nonce: {
      name: `next-auth.nonce`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
          domain: process.env.AUTH_COOKIE_DOMAIN || (process.env.NODE_ENV === 'production' ? '.geekstalk.org' : undefined),
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  events: {
    async signOut({ token }) {
      // Update user's lastSeen when they sign out
      if (token?.id) {
        try {
          await db.user.update({
            where: { id: (token as any).id },
            data: {
              lastSeen: new Date(),
              onlineStatus: 'offline'
            }
          });
          console.log('✅ Updated lastSeen on signOut for user:', (token as any).id);
        } catch (error) {
          console.error('❌ Error updating lastSeen on signOut:', error);
        }
      }
    },
  },
  callbacks: {
    async signIn({ user, account, profile }) {

      // Allow Google OAuth sign-in
      if (account?.provider === 'google') {

        return true;
      }
      // Allow credentials sign-in
      if (account?.provider === 'credentials') {

        return true;
      }

      return false;
    },
    async jwt({ token, user, account }) {
      if (user) {

        // For Google OAuth, create or find user in database
        if (account?.provider === 'google' && user.email) {
          console.log('🔍 Google OAuth user data:', {
            email: user.email,
            name: user.name,
            image: user.image,
            id: user.id
          });
          try {
            let dbUser = await db.user.findUnique({ where: { email: user.email } });

            if (!dbUser) {
              // Create new user
              dbUser = await db.user.create({
                data: {
                  email: user.email,
                  name: user.name,
                  image: user.image,
                  emailVerified: new Date(),
                }
              });

            } else {
              // Update existing user with latest Google OAuth data
              dbUser = await db.user.update({
                where: { email: user.email },
                data: {
                  name: user.name || dbUser.name,
                  image: user.image || dbUser.image,
                  emailVerified: new Date(),
                }
              });
            }

            (token as any).id = dbUser.id;
            token.name = dbUser.name || user.name;
            token.email = dbUser.email;
            (token as any).image = dbUser.image || user.image;
            
            console.log('🔍 Updated token with user data:', {
              id: (token as any).id,
              name: token.name,
              email: token.email,
              image: (token as any).image
            });
          } catch (error) {
            console.error('❌ Error in JWT callback:', error);
            // Fallback to user data from OAuth
            (token as any).id = user.id;
            token.name = user.name;
            token.email = user.email;
            (token as any).image = user.image;
          }
        } else {
          // For credentials provider
          (token as any).id = (user as any).id;
          token.name = user.name;
          token.email = user.email;
          (token as any).image = (user as any).image;
        }
      }
      return token;
    },
    async session({ session, token }) {
      console.log('🔍 Session callback - token data:', {
        tokenId: (token as any).id,
        tokenEmail: token.email,
        tokenName: token.name,
        tokenImage: (token as any).image
      });
      if (session.user) {
        (session.user as any).id = (token as any).id;
        session.user.name = token.name || session.user.name;
        session.user.email = token.email || session.user.email;
        session.user.image = (token as any).image || session.user.image;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      console.log('🔍 Redirect callback:', { url, baseUrl });
      
      // Force production domain for production environment
      if (process.env.NODE_ENV === 'production') {
        const productionBaseUrl = 'https://geekstalk.org';
        if (url.startsWith("/")) return `${productionBaseUrl}${url}`;
        if (url.includes('localhost')) return productionBaseUrl;
        if (new URL(url).origin === productionBaseUrl) return url;
        return productionBaseUrl;
      }
      
      // Development fallback
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  pages: {
    signIn: '/signin',
  },
};

