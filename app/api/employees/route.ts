import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { todayIST } from '@/lib/time';
import { z } from 'zod';

export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const id = params.get('id');
    const query = params.get('query')?.trim() || '';
    const s = supabaseAdmin();
    const fields = 'id,employee_id,full_name,department,designation,status';
    if (id) {
      if (!z.string().uuid().safeParse(id).success) return NextResponse.json({message:'Invalid employee.'},{status:400});
      const { data: employee, error } = await s.from('employees').select(fields).eq('id',id).eq('status','active').maybeSingle();
      if (error) throw error;
      if (!employee) return NextResponse.json({message:'Active employee not found.'},{status:404});
      const {data: today,error: attendanceError} = await s.from('attendance').select('check_in,check_out,worked_minutes,status').eq('employee_id',id).eq('attendance_date',todayIST()).maybeSingle();
      if (attendanceError) throw attendanceError;
      return NextResponse.json({employee,today},{headers:{'Cache-Control':'no-store'}});
    }
    if (query.length < 2 || query.length > 64 || !/^[a-zA-Z0-9+ -]+$/.test(query)) return NextResponse.json({message:'Enter at least 2 letters or digits of your employee ID or mobile number.'},{status:400});
    const {data,error} = await s.from('employees').select(fields).eq('status','active').or(`employee_id.ilike.${query}*,mobile.ilike.${query}*`).order('employee_id').limit(8);
    if (error) throw error;
    return NextResponse.json({employees:data || []},{headers:{'Cache-Control':'no-store'}});
  } catch {
    return NextResponse.json({message:'Employee search is unavailable. Please try again.'},{status:500});
  }
}
