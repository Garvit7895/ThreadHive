import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { signToken } from '@/lib/auth';

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const email = url.searchParams.get('email');
        const token = url.searchParams.get('token');
    
        if (!email || !token) {
            return NextResponse.json({ error: 'Email and token are required' }, { status: 400 });
        }
        
        // Validate email and token format using Zod
        const validationSchema = z.object({
            email: z.string().email('Invalid email format'),
            token: z.string().min(6, 'Token must be at least 6 characters')
        });
        
        try {
            validationSchema.parse({ email, token });
        } catch (validationError) {
            if (validationError instanceof z.ZodError) {
                return NextResponse.json({ error: validationError}, { status: 400 });
            }
        }
    
        // Find the user by email
        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, emailVerified: true, emailVerificationToken: true, name: true, role: true },
        });
    
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
    
        if (user.emailVerified) {
            return NextResponse.json({ message: 'Email already verified' }, { status: 200 });
        }
    
        if (user.emailVerificationToken !== token) {
            return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
        }
    
        // Update user's email verification status
        await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: true, emailVerificationToken: null },
        });
        
        // Automatically log in the user
        const payload = {
            id: user.id,
            email,
            name: user.name,
            role: user.role
        };
        
        const accessToken = signToken(payload);
        
        return NextResponse.json({ 
            message: 'Email verified successfully',
            accessToken,
            user: payload
        }, { status: 200 });
    } 
    catch (error) {
        console.error('Error verifying email:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}