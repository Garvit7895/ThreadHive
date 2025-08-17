import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function PUT(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, name, description, rules, avatarUrl, bannerUrl } =
      await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "community ID is required" },
        { status: 400 }
      );
    }

    // Check if user is owner or admin
    const membership = await prisma.CommunityMembership.findFirst({
      where: {
        communityId: BigInt(id),
        userId: user.id,
        role: { in: ["OWNER", "ADMIN"] },
      },
    });

    if (!membership) {
      return NextResponse.json({
        error: "Not authorized to edit this community",
      });
    }

    const updated = await prisma.community.update({
      where: { id: BigInt(id) },
      data: { name, description, rules, avatarUrl, bannerUrl },
    });
    return NextResponse.json({
      message: "Community Updated",
      community: updated,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
