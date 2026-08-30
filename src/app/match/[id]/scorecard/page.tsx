import ScorecardClient from "@/components/ScorecardClient";
export const dynamic="force-dynamic";
export const revalidate=0;
export default async function Scorecard({params}:{params:Promise<{id:string}>}){const {id}=await params;return <ScorecardClient id={id}/>}