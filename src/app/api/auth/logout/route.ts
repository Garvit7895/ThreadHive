import { NextResponse } from "next/server";
import { clearTokenOnResponse } from "@/lib/auth";

export async function POST(){
  const res=NextResponse.json({ok:true});
  clearTokenOnResponse(res);
  return res;

}