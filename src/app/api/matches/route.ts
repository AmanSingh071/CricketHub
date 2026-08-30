import { NextResponse } from "next/server";
import { classify, getCurrentMatches } from "@/lib/cricket";
export const revalidate=60;
export async function GET(){
 const matches=await getCurrentMatches();
 return NextResponse.json({updatedAt:new Date().toISOString(),...classify(matches),all:matches},{headers:{"Cache-Control":"s-maxage=60, stale-while-revalidate=300"}});
}
