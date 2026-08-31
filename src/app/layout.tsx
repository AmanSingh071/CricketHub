import type { Metadata } from "next";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import ScoreTicker from "@/components/ScoreTicker";
export const metadata:Metadata={title:"CricketHub | Live Cricket, Scores & Stats",description:"Live cricket scores, fixtures, rankings, match centres and cricket analytics."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><SiteHeader/><ScoreTicker/>{children}</body></html>}