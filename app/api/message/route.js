import { NextResponse } from 'next/server';
import { supabase } from '../../../utils/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    const { data, error } = await supabase
        .from('test_messages')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Supabase GET Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { content } = body;

        const { data, error } = await supabase
            .from('test_messages')
            .insert([{ content }])
            .select();

        if (error) {
            console.error('Supabase POST Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json(data);
    } catch (err) {
        console.error('Server POST Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
