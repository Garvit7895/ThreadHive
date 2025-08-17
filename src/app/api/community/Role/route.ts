import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

const ALLOWED_ROLES = ["ADMIN", "MODERATOR", "MEMBER", "GUEST"] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

function isAllowedRole(role: string): role is AllowedRole {
  return (ALLOWED_ROLES as readonly string[]).includes(role);
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const actingUser = await getUserFromRequest(req);
    if (!actingUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const communityId = BigInt(params.id);
    const { targetUserId, newRole } = await req.json();

    if (!targetUserId || !newRole) {
      return NextResponse.json(
        { error: "targetUserId and newRole are required" },
        {
          status: 400,
        }
      );
    }

    if (isAllowedRole(newRole)) {
      return NextResponse.json(
        {
          error: `newRole  must be one of ${ALLOWED_ROLES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const targetId = BigInt(String(targetUserId));

    // 1) Make sure both acting user and target are members

    const [actingMembership, targetMembership] = await Promise.all([
      prisma.communityMembership.findUnique({
        where: {
          communityId_userId: { communityId, userId: actingUser.id },
        },
        select: {
          role: true,
          userId: true,
        },
      }),
      prisma.communityMembership.findUnique({
        where: {
          communityId_userId: { communityId, userId: targetId },
        },
        select: {
          role: true,
          userId: true,
        },
      }),
    ]);

    if (!actingMembership) {
      return NextResponse.json(
        {
          error: "You are not a member of this community",
        },
        {
          status: 403,
        }
      );
    }

    if (!targetMembership) {
      return NextResponse.json(
        {
          error: "Target User is not a member of this community",
        },
        {
          status: 400,
        }
      );
    }

    const actorRole = actingMembership.role; // OWNER | ADMIN | MODERATOR | MEMBER | GUEST
    const targetRole = targetMembership.role;

    // 2) Guardrails: cannot change OWNER, cannot set OWNER here

    if (targetRole === "OWNER") {
      return NextResponse.json(
        { error: "You cannot change the role of the owner" },
        { status: 403 }
      );
    }
    if (newRole === "OWNER") {
      return NextResponse.json(
        { error: "Use a dedicated ownership transfer endpoint" },
        { status: 400 }
      );
    }

    // 3) Permission matrix

    const isowner = actorRole === "OWNER";
    const isAdmin = actorRole === "ADMIN";

    // Only owners can modify admins
    if (targetRole === "ADMIN" && !isowner) {
      return NextResponse.json(
        {
          error: "only the owner can modify an admin",
        },
        {
          status: 403,
        }
      );
    }

    // Only owners can assign or remove ADMIN role

    if (newRole === "ADMIN" && !isowner) {
      return NextResponse.json(
        {
          error: "only the owner can assign admin role",
        },
        {
          status: 403,
        }
      );
    }

    // Admins (and owners) can manage moderators/members/guests

    if (!(isowner || isAdmin)) {
      return NextResponse.json(
        { error: "Only owner or admin can change roles" },
        { status: 403 }
      );
    }

    // 4 perform the role change

    const updated = await prisma.communityMembership.update({
      where: {
        communityId_userId: { communityId, userId: targetId },
      },
      data: {
        role: newRole as any,
        assignedBy: actingUser.id,
      },
      select: {
        userId: true,
        role: true,
      },
    });

    return NextResponse.json({
      message: "Role Updated",
      membership: {
        userId: String(updated.userId),
        role: updated.role,
      },
    });
  } catch (err) {
    console.error("ROLE ASSIGNMENT error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
