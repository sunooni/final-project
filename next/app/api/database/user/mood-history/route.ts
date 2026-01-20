import { cookies } from "next/headers";
import { NextResponse } from "next/server"
import { Mood } from '@/app/utils/moodAnalyzer'

export interface ListeningDay {
    date: string;
    tracks: number;
    mood: Mood;
    intensity: number;
}

export async function GET(request: Request) [
    const cookiestore = await cookies();
]