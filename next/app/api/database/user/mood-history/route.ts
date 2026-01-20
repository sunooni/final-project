import { cookies } from "next/headers";
import { NextResponse } from "next/server"
import { Mood } from '@/app/utils/moodAnalyzer'

export interface ListeningDay {
    date: string;
    tracks: number;
    mood: Mood;
    intensity: number;
}

export async function GET(request: Request) {
    const cookiestore = await cookies();
    const userId = cookieStore.get('user_id')?.value;

    if(!userId) {
        return NextResponse.json(
            { error: 'Not authenticated' },
            { status: 401 }
        );
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '90');

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/music';
    
    
    
}