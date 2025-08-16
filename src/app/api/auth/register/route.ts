import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from 'bcrypt';
import crypto from "crypto";
import { z } from 'zod';
import { signToken, attachTokenToResponse } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/mailer";

const RegisterSchema = z.object({
  username: z.string().min(3),
  email: z.email(),
  password: z.string().min(6),
})


export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const { username, email, password } = RegisterSchema.parse(payload);
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
      select: { id: true, username: true, email: true, passwordHash: true },
    });

    if (existing) {
      const ok = await bcrypt.compare(password, existing.passwordHash);
      if(ok) {
        // If the user already exists with the same credentials, we can log them in.
        const token = signToken({ sub: existing.id.toString(), email: existing.email });
        const res = NextResponse.json({ user: { id: existing.id, username: existing.username, email: existing.email } });
        attachTokenToResponse(res, token);
        // Update lastLoginAt
        await prisma.user.update({
          where: { id: existing.id },
          data:  { lastLoginAt: new Date() }
        }).catch(() => null);
        return res;
      }
      return NextResponse.json({ error: 'Email or Username is already in use' }, { status: 400 })
    }

    const emailExists = await prisma.user.findUnique({
      where : {
        email,
      }
    });

    // If the user exists but hasn't verified their email, we can resend the verification email.
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    if(emailExists && !emailExists.emailVerified) {
      await prisma.user.update({
        where: { id: emailExists.id },
        data: { 
          emailVerificationToken: verificationToken,
          tokenExpiry: tokenExpiry,
        }
      });
      
      // Here you would send the verification email again, e.g. using a mailer service
      await sendVerificationEmail(existing.email, verificationToken);
      
      return NextResponse.json({ message: 'Verification email sent again' }, { status: 200 });  
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        verificationToken : verificationToken,
        tokenExpiry: tokenExpiry,
      },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true
      }
    });
    

    // Here we will need to call verificationEmail before giving login access

    await sendVerificationEmail(user.email, verificationToken);

    
    // const token = signToken({ sub: user.id.toString(), email: user.email });

    // const res = NextResponse.json({ user });
    // attachTokenToResponse(res, token);
    // return res;
  }
  catch (err: any) {
    // zod validation errors
    if (err?.issues) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}