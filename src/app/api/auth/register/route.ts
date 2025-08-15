import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { signToken, attachTokenToResponse } from "@/lib/auth";

const RegisterSchema = z.object({
  username: z.string().min(3),
  email: z.email(),
  password: z.string().min(6)

})

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const { username, email, password } = RegisterSchema.parse(payload);

    // check duplicates
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Email or Username is already in use' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password
      },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true
      }
    });

    const token = signToken({ sub: user.id.toString(), email: user.email });

    const res = NextResponse.json({ user });
    attachTokenToResponse(res, token);
    return res;
  }
  catch (err: any) {
    // zod validation errors
    if (err?.issues) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}