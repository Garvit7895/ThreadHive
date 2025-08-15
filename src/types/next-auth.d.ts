import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string; // or number if you use BigInt in DB and serialize as string
    } & DefaultSession["user"];
  }

  interface User {
    id: string; // or number, but for NextAuth we usually keep it as string
  }
}
