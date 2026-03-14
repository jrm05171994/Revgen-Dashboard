import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Invite-only: user must have an unused Invite record
      if (!user.email) return false;
      const invite = await prisma.invite.findUnique({
        where: { email: user.email },
      });
      if (!invite || invite.usedAt) return false;

      // Mark invite as used — role will be applied in events.createUser
      await prisma.invite.update({
        where: { email: user.email },
        data: { usedAt: new Date() },
      });

      return true;
    },

    async session({ session, user }) {
      // Attach role to session so UI can gate by role
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true },
      });
      if (dbUser) {
        session.user.role = dbUser.role as UserRole;
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

  pages: {
    signIn: "/login",
    error: "/login",
  },
});
