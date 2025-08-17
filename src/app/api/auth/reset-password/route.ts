import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from 'bcrypt';
import { z } from 'zod';

const ResetPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
  token: z.string().min(1, "Token is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, token, password } = ResetPasswordSchema.parse(body);

    // Find user with matching email and token
    const user = await prisma.user.findFirst({
      where: {
        email,
        passResetToken: token,
        passTokenExpiry: {
          gt: new Date(), // token must not be expired
        },
      },
    });

    if (!user) {
      return NextResponse.json({ 
        error: "Invalid or expired reset token" 
      }, { status: 400 });
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update user with new password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    });

    return NextResponse.json({ 
      message: "Password successfully reset" 
    }, {status: 200});
    
  } catch (error: any) {
    console.error("Reset password error:", error);
    
    // Handle validation errors
    if (error?.issues) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: "An error occurred while processing your request" 
    }, { status: 500 });
  }
}