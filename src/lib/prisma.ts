import { PrismaClient } from "@prisma/client";
declare global{
  var __prisma:PrismaClient|undefined;
}
export const prisma=globalThis.__prisma??new PrismaClient({
  log:['error','warn']
});
if(process.env.NODE_ENV!=='production')global.__prisma=prisma;
export default prisma