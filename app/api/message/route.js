import { NextResponse } from 'next/server';
import { supabase } from '../../../utils/supabase';

export async function GET() {
    const { data, error } = await supabase.from('test_messages').select('*').order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

export async function POST(request) {
    const body = await request.json();
    const { content } = body;
    
    const { data, error } = await supabase.from('test_messages').insert([{ content }]).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}
