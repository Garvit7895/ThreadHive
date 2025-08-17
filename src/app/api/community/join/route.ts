import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const communityId = BigInt(params.id);

    // Already a member
    const existing = await prisma.communityMembership.findUnique({
      where: {
        communityId_userId: {
          communityId,
          userId: user.id,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Already a member" }, { status: 409 });
    }

    await prisma.communityMembership.create({
      data: {
        communityId,
        userId: user.id,
        role: "MEMBER",
      },
    });
    return NextResponse.json(
      { message: "Joined community successfully" },
      { status: 201 }
    );
  } catch (err) {
    console.error("JOIN community error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
