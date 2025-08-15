import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { signToken, attachTokenToResponse } from '@/lib/auth';

const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(6)

})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, password } = LoginSchema.parse(body)

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, username: true, email: true, passwordHash: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'Invalid Credentials' }, { status: 401 })
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return NextResponse.json({ error: 'Invalid Credentials' }, { status: 401 })
    // update lastloginat
    await prisma.user.update({
      where: { id: (BigInt(user.id) as any) ?? (user.id as any) },
      data: { lastLoginAt: new Date() } as any,
    }).catch(() => null);

    const token = signToken({ sub: user.id.toString(), email: user.email });

    const res = NextResponse.json({ user: { id: user.id, username: user.username, email: user.email } });

    attachTokenToResponse(res, token);
    return res;
  }
  catch (err: any) {
    if (err?.issues) return NextResponse.json({ error: err.issues }, { status: 400 })
    return NextResponse.json({ error: 'Login Failed' }, { status: 500 });
  }
}
