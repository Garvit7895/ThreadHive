import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(req:Request){
  try{
   const user=await getUserFromRequest(req);
   if(!user){
      return NextResponse.json({error:'Unauthorized'},{status:401});
   }

   const {name,description,rules,avatarUrl,bannerUrl}=await req.json();
   if(!name){
    return NextResponse.json({error:'Name is required'},{status:400});
   }

   const community= await prisma.community.create({
    data:{
    name,description,rules,createdBy:user.id,avatarUrl,bannerUrl
   }});

// Add creator as owner in CommunityMembership

await prisma.CommunityMembership.create({
  data:{
    userId:user.id,
    communityId:community.id,
    role:'OWNER'
  }
})

return NextResponse.json({message:'community created',community},{status:201});


  }
  catch(error){
   console.log(error)
   return NextResponse.json({error:'Server error'},{status:500});
  }
}