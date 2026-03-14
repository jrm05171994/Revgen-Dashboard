import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// Lightweight config with no Prisma — safe for Edge Runtime (middleware)
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthRoute = nextUrl.pathname.startsWith("/login");
      const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth");
      const isCronRoute =
        nextUrl.pathname.startsWith("/api/sync") ||
        nextUrl.pathname.startsWith("/api/snapshot");

      if (isApiAuthRoute || isCronRoute) return true;
      if (isAuthRoute) {
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
        return true;
      }
      if (!isLoggedIn) {
        return Response.redirect(new URL("/login", nextUrl));
      }
      return true;
    },
  },
};
