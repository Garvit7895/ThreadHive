import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { z } from 'zod';
import { sendPasswordResetEmail } from "@/lib/mailer";

const ForgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = ForgotPasswordSchema.parse(body);

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Even if user doesn't exist, return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ 
        message: "If your email exists in our system, you will receive a password reset link." 
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const tokenExpiry = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour from now

    // Save reset token and expiry to user record
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passResetToken: resetToken,
        passTokenExpiry: tokenExpiry,
      },
    });

    // Send reset email
    await sendPasswordResetEmail(user.email, resetToken);

    return NextResponse.json({
      message: "If your email exists in our system, you will receive a password reset link."
    });
    
  } catch (error: any) {
    console.error("Forgot password error:", error);
    
    // Handle validation errors
    if (error?.issues) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: "An error occurred while processing your request" 
    }, { status: 500 });
  }
}
