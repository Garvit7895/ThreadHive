import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function DELETE(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json(
        { error: "community Id is required" },
        { status: 400 }
      );
    }
    // verify Ownership

    const community = await prisma.community.findUninque({
      where: { id: BigInt(id) },
    });

    if (!community || community.createdBy !== user.id) {
      return NextResponse.json(
        { error: "Only owner can delete" },
        { status: 403 }
      );
    }

    await prisma.community.delete({ where: { id: BigInt(id) } });

    return NextResponse.json({ meassage: "Community deleted" });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
