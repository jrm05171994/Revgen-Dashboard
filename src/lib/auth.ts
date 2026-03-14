import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import type { UserRole } from "@prisma/client";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;

      // If user already exists in DB, allow sign-in
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true },
      });
      if (existingUser) return true;

      // New user — must have an unused invite
      const invite = await prisma.invite.findUnique({
        where: { email: user.email },
      });
      if (!invite || invite.usedAt) return false;

      // Mark invite as used — role applied in events.createUser
      await prisma.invite.update({
        where: { email: user.email },
        data: { usedAt: new Date() },
      });

      return true;
    },

    async jwt({ token, user }) {
      // On first sign-in, fetch role from DB and store in token
      if (user?.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { id: true, role: true },
        });
        token.id = dbUser?.id ?? user.id;
        token.role = dbUser?.role ?? "REVGEN";
      }
      return token;
    },

    async session({ session, token }) {
      // Attach id and role from JWT token to session
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    },
  },

  events: {
    async createUser({ user }) {
      // Called after User row is created by PrismaAdapter on first sign-in.
      // Apply role from invite record.
      if (!user.email) return;
      const invite = await prisma.invite.findUnique({
        where: { email: user.email },
      });
      if (!invite) return;
      await prisma.user.update({
        where: { email: user.email },
        data: { role: invite.role },
      });
    },
  },

});
