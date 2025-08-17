import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

    // Check membership + role
    const membership = await prisma.communityMembership.findUnique({
      where: {
        communityId_userId: {
          communityId,
          userId: user.id,
        },
      },
      select: { role: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "Not a Member" }, { status: 400 });
    }

    if (membership.role === "OWNER") {
      const ownerCount = await prisma.communityMembership.count({
        where: {
          communityId,
          role: "OWNER",
        },
      });

      if (ownerCount <= 1) {
        return NextResponse.json(
          {
            error: "Owner must transfer ownership before leaving",
          },
          {
            status: 400,
          }
        );
      }
    }
    await prisma.communityMembership.delete({
      where: {
        communityId_userId: {
          communityId,
          userId: user.id,
        },
      },
    });

    return NextResponse.json(
      {
        message: "Left community successfully",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("LEAVE community error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
