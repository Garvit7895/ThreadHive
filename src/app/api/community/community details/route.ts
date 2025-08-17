import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(req);
    const communityId = BigInt(params.id);

    const community = await prisma.community.findUnique({
      where: { id: communityId },
      include: {
        creator: { select: { id: true, username: true, avatarUrl: true } },
        _count: { select: { memberships: true, posts: true } },
        ...(user && {
          memberships: {
            where: { userId: user.id },
            select: { role: true, userId: true },
            take: 1,
          },
        }),
      },
    });

    if (!community) {
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: String(community.id),
      name: community.name,
      description: community.description,
      rules: community.rules,
      avatarUrl: community.avatarUrl,
      bannerUrl: community.bannerUrl,
      createdAt: community.createdAt,
      creator: community.creator,
      counts: {
        members: community._count.memberships,
        posts: community._count.posts,
      },
      isMember: !!(community.memberships && community.memberships.length > 0),
      myRole: community.memberships?.[0]?.role ?? null,
    });
  } catch (err) {
    console.error("COMMUNITY details error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
