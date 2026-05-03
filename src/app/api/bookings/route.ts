import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    // Build-safe check
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase credentials missing. Check Vercel Environment Variables.');
      return NextResponse.json({ error: 'Configuration Error' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const data = await req.json();
    const { name, email, phone, company, date, time } = data;

    // 1. Save to Supabase
    const { error: dbError } = await supabase
      .from('bookings')
      .insert([
        { name, email, phone, company, booking_date: date, booking_time: time }
      ]);

    if (dbError) {
      console.error('Database Error:', dbError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Booking API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
