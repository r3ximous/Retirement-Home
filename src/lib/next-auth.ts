import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "Email or phone",
    credentials: {
      identifier: { label: "Email or phone number", type: "text" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const identifier = credentials?.identifier?.trim();
      const password = credentials?.password;

      if (!identifier || !password || identifier.length > 254 || password.length > 128) {
        return null;
      }

      const normalizedIdentifier = identifier.includes("@")
        ? identifier.toLowerCase()
        : identifier;
      const profile = await prisma.userProfile.findFirst({
        where: {
          OR: [
            { email: normalizedIdentifier },
            { phone: normalizedIdentifier },
          ],
        },
        select: { id: true, email: true, fullName: true, passwordHash: true },
      });

      if (
        !profile?.passwordHash ||
        !(await verifyPassword(password, profile.passwordHash))
      ) {
        return null;
      }

      return {
        id: profile.id,
        email: profile.email,
        name: profile.fullName,
      };
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") {
        return true;
      }

      const email = user.email?.trim().toLowerCase();
      if (!email) {
        return false;
      }

      const profile = await prisma.userProfile.upsert({
        where: { email },
        create: {
          email,
          fullName: user.name?.trim() || email.split("@")[0],
        },
        update: user.name?.trim() ? { fullName: user.name.trim() } : {},
        select: { id: true, fullName: true },
      });
      user.id = profile.id;
      user.name = profile.fullName;
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
};
