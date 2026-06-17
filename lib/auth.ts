import { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { verifyTOTP, hashBackupCode } from "@/lib/totp";
import { rateLimit } from "@/lib/rateLimit";

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
  // For development, ensure localhost is properly configured
  ...(process.env.NODE_ENV === 'development' && {
    url: process.env.NEXTAUTH_URL || 'http://localhost:3000',
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
        totp: { label: '2FA Code', type: 'text' },
      },
      async authorize(credentials, _req) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await db.user.findUnique({ where: { email: credentials.email } });
        if (!user || !user.hashedPassword) return null;
        const valid = await verifyPassword(credentials.password, user.hashedPassword);
        if (!valid) return null;

        // Enforce 2FA for accounts that have it enabled. This only affects the
        // credentials (email+password) path — Google OAuth is unaffected, and
        // accounts WITHOUT 2FA enabled are not impacted at all. The thrown
        // markers are surfaced to the sign-in page so it can prompt for a code.
        if (user.twoFactorEnabled) {
          const totp = ((credentials as any).totp ?? '').toString().trim();
          if (!totp) {
            throw new Error('2FA_REQUIRED');
          }
          const rl = await rateLimit(`login-2fa:${user.id}`, 10, 60_000);
          if (!rl.allowed) {
            throw new Error('2FA_RATE_LIMIT');
          }
          let ok = false;
          if (user.twoFactorSecret && /^\d{6}$/.test(totp)) {
            ok = verifyTOTP(user.twoFactorSecret, totp, { window: 1 });
          }
          // Fall back to a single-use backup code.
          if (!ok && user.twoFactorBackupCodes?.length) {
            const hashed = hashBackupCode(totp);
            if (user.twoFactorBackupCodes.includes(hashed)) {
              ok = true;
              await db.user.update({
                where: { id: user.id },
                data: { twoFactorBackupCodes: user.twoFactorBackupCodes.filter((c) => c !== hashed) },
              });
            }
          }
          if (!ok) {
            throw new Error('2FA_INVALID');
          }
        }

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
          domain: process.env.NODE_ENV === 'production' ? (process.env.AUTH_COOKIE_DOMAIN || '.geekstalk.org') : undefined,
        secure: process.env.NODE_ENV === 'production',
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        sameSite: 'lax',
        path: '/',
          domain: process.env.NODE_ENV === 'production' ? (process.env.AUTH_COOKIE_DOMAIN || '.geekstalk.org') : undefined,
        secure: process.env.NODE_ENV === 'production',
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
          domain: process.env.NODE_ENV === 'production' ? (process.env.AUTH_COOKIE_DOMAIN || '.geekstalk.org') : undefined,
        secure: process.env.NODE_ENV === 'production',
      },
    },
    pkceCodeVerifier: {
      name: `next-auth.pkce.code_verifier`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
          domain: process.env.NODE_ENV === 'production' ? (process.env.AUTH_COOKIE_DOMAIN || '.geekstalk.org') : undefined,
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
          domain: process.env.NODE_ENV === 'production' ? (process.env.AUTH_COOKIE_DOMAIN || '.geekstalk.org') : undefined,
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
          domain: process.env.NODE_ENV === 'production' ? (process.env.AUTH_COOKIE_DOMAIN || '.geekstalk.org') : undefined,
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
          if (process.env.NODE_ENV === 'development') console.log('🔍 Google OAuth user data:', {
            email: user.email,
            name: user.name,
            image: user.image,
            id: user.id,
            accountProvider: account.provider,
            accountProviderAccountId: account.providerAccountId,
            accountType: account.type,
            accountKeys: Object.keys(account),
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

            // Ensure we track the linked Google account for this user
            if (account?.providerAccountId) {
              try {
                const accountRecord = await db.account.upsert({
                  where: {
                    provider_providerAccountId: {
                      provider: 'google',
                      providerAccountId: account.providerAccountId,
                    },
                  },
                  update: {
                    userId: dbUser.id,
                    access_token: (account as any).access_token ?? null,
                    refresh_token: (account as any).refresh_token ?? null,
                    expires_at: (account as any).expires_at ?? null,
                    token_type: (account as any).token_type ?? null,
                    scope: (account as any).scope ?? null,
                    id_token: (account as any).id_token ?? null,
                    session_state: (account as any).session_state ?? null,
                  },
                  create: {
                    userId: dbUser.id,
                    type: account.type ?? 'oauth',
                    provider: 'google',
                    providerAccountId: account.providerAccountId,
                    access_token: (account as any).access_token ?? null,
                    refresh_token: (account as any).refresh_token ?? null,
                    expires_at: (account as any).expires_at ?? null,
                    token_type: (account as any).token_type ?? null,
                    scope: (account as any).scope ?? null,
                    id_token: (account as any).id_token ?? null,
                    session_state: (account as any).session_state ?? null,
                  },
                });
                if (process.env.NODE_ENV === 'development') console.log('✅ Google account linked successfully:', {
                  accountId: accountRecord.id,
                  userId: dbUser.id,
                  providerAccountId: account.providerAccountId,
                });
              } catch (accountError: any) {
                console.error('❌ Error upserting Google account link:', accountError);
                // If it's a unique constraint error, try to find and update existing account
                if (accountError.code === 'P2002' || accountError.message?.includes('Unique constraint')) {
                  try {
                    // Try to find existing account and update userId
                    const existingAccount = await db.account.findUnique({
                      where: {
                        provider_providerAccountId: {
                          provider: 'google',
                          providerAccountId: account.providerAccountId,
                        },
                      },
                    });
                    if (existingAccount && existingAccount.userId !== dbUser.id) {
                      // Update the userId to link to current user
                      await db.account.update({
                        where: { id: existingAccount.id },
                        data: { userId: dbUser.id },
                      });
                      console.log('✅ Updated existing Google account link to current user');
                    }
                  } catch (updateError) {
                    console.error('❌ Error updating existing account:', updateError);
                  }
                }
              }
            } else {
              console.warn('⚠️ Google OAuth account missing providerAccountId:', account);
            }

            (token as any).id = dbUser.id;
            token.name = dbUser.name || user.name;
            token.email = dbUser.email;
            (token as any).image = dbUser.image || user.image;
            
            if (process.env.NODE_ENV === 'development') console.log('🔍 Updated token with user data:', {
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
      if (process.env.NODE_ENV === 'development') console.log('🔍 Session callback - token data:', {
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

