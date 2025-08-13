import jwt, { Secret, SignOptions } from "jsonwebtoken";
import { serialize, parse } from "cookie";
import { NextResponse } from "next/server";
import prisma from "./prisma";

// Environment variables
const COOKIE_NAME = process.env.COOKIE_NAME || "threadhive_token";
const JWT_SECRET: Secret = process.env.JWT_SECRET as string;
const JWT_EXPIRES_IN: SignOptions["expiresIn"] =
  (process.env.JWT_EXPIRES_IN as SignOptions["expiresIn"]) || "7d";
const MAX_AGE = 7 * 24 * 60 * 60; // in seconds

// -----------------------------
// Generate JWT Token
// -----------------------------
export function signToken(payload: object): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}
/** Verify token; throws if invalid */
export function verifyToken<T= any>(token:string):T {
return jwt.verify(token,JWT_SECRET) as unknown as T
}

/** Set token into a NextResponse (HTTP-only cookie) */
export function attachTokenToResponse(res: NextResponse,token:string){
  res.cookies.set({
    name:COOKIE_NAME,
    value:token,
    httpOnly:true,
    maxAge:MAX_AGE,
    path:'/',
    sameSite:'lax',
    secure:process.env.NODE_ENV==='production',
  })
}

/** Clear auth cookie */
export function clearTokenOnResponse(res:NextResponse){
  res.cookies.set({
   name: COOKIE_NAME,
    value: '',
    maxAge: 0,
    path: '/',
})
}

export function  getTokenFromRequest(req:Request): string | null{
 const cookieHeader=req.headers.get('cookie') ?? '';
 if(!cookieHeader)return null;
 const parsed=parse(cookieHeader || '');
 return parsed[COOKIE_NAME] ?? null;
}

export async function getUserFromRequest(req:Request){
  try{
    const token=getTokenFromRequest(req);
    if(!token)return null
    const payload=verifyToken<{sub:string}>(token);
    if(!payload?.sub)return null;

    // if your User.id is BigInt in Prisma: convert
    const userId=(()=>{
      try{
        // try BigInt conversion (works if id stored as numeric bigint)
        return BigInt(payload.sub) as any;
      }
      catch{
        // otherwise treat as string id
        return payload.sub;
      }
    })
  
 const user=await prisma.user.findUnique({
    where:{id:userId} as any,
    select:{
      id:true,
      username:true,
      email: true,
        bio: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
    },
  })
   return user;
  }
  catch(err){
       return null;
  }
}

