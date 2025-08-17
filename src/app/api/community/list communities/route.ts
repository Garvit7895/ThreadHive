import { getUserFromRequest } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// transform or convert (coerce) values received from a URL's query string

function toInt(v: string | null, d: number) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 50) : d; //hard cap 50
}

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);

    const q = url.searchParams.get("q")?.trim() || ""; // search by name/description
    const take = toInt(url.searchParams.get("limit"), 20); //page size
    const cursor = url.searchParams.get("cursor"); //cursor is last community id
    const mine = url.searchParams.get("mine") === "true"; // only communities I’m in
    const sort = url.searchParams.get("sort") || "new"; // new | members | posts |name

    // WHERE clause
    const where: any = {};
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    if (mine && user) {
      where.memberships = { some: { userId: user.id } };
    }

    // ORDER BY
    let orderBy: any = [{ id: "desc" as const }]; //default :newest
    if (sort === "members") {
      orderBy = [
        { memberships: { _count: "desc" as const } },
        { id: "desc" as const },
      ];
    } else if (sort === "posts") {
      orderBy = [
        { posts: { _count: "desc" as const } },
        { id: "desc" as const },
      ];
    } else if (sort === "name") {
      orderBy = [{ name: "asc" as const }];
    }

    const queryOptions: any = {
      where,
      take: take + 1,
      orderBy,
      include: {
        creator: { select: { id: true, username: true, avatarUrl: true } },
        _count: { select: { memberships: true, posts: true } },
        // for isMember: include only the current user's membership (if logged in)
        ...(user && {
          memberships: {
            where: { userId: user.id },
            select: { userId: true, role: true },
            take: 1,
          },
        }),
      },
    };

    if (cursor) {
      queryOptions.cursor = { id: BigInt(cursor) };
      queryOptions.skip = 1;
    }
    const rows = await prisma.community.findMany(queryOptions);

    let nextcursor: string | null = null;
    if (rows.length > take) {
      const next = rows.pop()!;
      nextcursor = String(next.id);
    }

    const data = rows.map((c: any) => ({
      id: String(c.id),
      name: c.name,
      description: c.description,
      avatarUrl: c.avatarUrl,
      bannerUrl: c.bannerUrl,
      createdAt: c.createdAt,
      creator: c.creator,
      counts: {
        members: c._count.memberships,
        posts: c._count.posts,
      },
      isMember: !!(c.memberships && c.memberships.length > 0),
      role: c.memberships?.[0]?.role ?? null,
    }));

    return NextResponse.json({ data, nextcursor });
  } catch (err) {
    console.error("LIST communities error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
