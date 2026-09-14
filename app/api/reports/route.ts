import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

type AttendanceRow = {
  attendance_date: string;
  check_in: string | null;
  check_out: string | null;
  worked_minutes: number | null;
  status: string;
  penalty: boolean;
  penalty_reason: string | null;
  employees?: {
    employee_id?: string | null;
    full_name?: string | null;
    department?: string | null;
    designation?: string | null;
  } | null;
};

function csvEscape(value: unknown) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

async function getRows(from: string, to: string, employeeId?: string) {
  const s = supabaseAdmin();

  let query = s
    .from('attendance')
    .select(
      'id,attendance_date,check_in,check_out,worked_minutes,status,penalty,penalty_reason,employees(employee_id,full_name,department,designation)'
    )
    .gte('attendance_date', from)
    .lte('attendance_date', to)
    .order('attendance_date')
    .order('employee_id');

  if (employeeId) {
    query = query.eq('employee_id', employeeId);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data ?? []) as AttendanceRow[];
}

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: auth.status });
  }

  const url = new URL(req.url);
  const date = url.searchParams.get('date');
  const from = url.searchParams.get('from') || date || new Date().toISOString().slice(0, 10);
  const to = url.searchParams.get('to') || from;
  const format = url.searchParams.get('format') || 'json';
  const status = url.searchParams.get('status') || undefined;
  const penaltyOnly = url.searchParams.get('penalty') === 'true';
  const employeeId = url.searchParams.get('employeeId') || undefined;

  try {
    let data = await getRows(from, to, employeeId);

    if (status) {
      data = data.filter((row) => row.status === status);
    }
    if (penaltyOnly) {
      data = data.filter((row) => row.penalty === true);
    }

    if (format === 'json') {
      return NextResponse.json({ from, to, count: data.length, data, rows: data });
    }

    if (format === 'csv') {
      const head = [
        'Date',
        'Employee ID',
        'Name',
        'Department',
        'Designation',
        'Check In',
        'Check Out',
        'Worked',
        'Status',
        'Penalty',
        'Penalty Reason',
      ];

      const lines = [head.map(csvEscape).join(',')];
      for (const row of data) {
        lines.push(
          [
            row.attendance_date,
            row.employees?.employee_id,
            row.employees?.full_name,
            row.employees?.department,
            row.employees?.designation,
            row.check_in,
            row.check_out,
            row.worked_minutes,
            row.status,
            row.penalty ? 'Yes' : 'No',
            row.penalty_reason,
          ]
            .map(csvEscape)
            .join(',')
        );
      }

      return new NextResponse(lines.join('\n'), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="attendance-${from}-to-${to}.csv"`,
        },
      });
    }

    if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Attendance');

      worksheet.columns = [
        { header: 'Date', key: 'date', width: 14 },
        { header: 'Employee ID', key: 'employeeId', width: 16 },
        { header: 'Name', key: 'name', width: 26 },
        { header: 'Department', key: 'department', width: 18 },
        { header: 'Designation', key: 'designation', width: 20 },
        { header: 'Check In', key: 'checkIn', width: 24 },
        { header: 'Check Out', key: 'checkOut', width: 24 },
        { header: 'Worked Minutes', key: 'worked', width: 16 },
        { header: 'Status', key: 'status', width: 14 },
        { header: 'Penalty', key: 'penalty', width: 12 },
        { header: 'Penalty Reason', key: 'reason', width: 28 },
      ];

      for (const row of data) {
        worksheet.addRow({
          date: row.attendance_date,
          employeeId: row.employees?.employee_id,
          name: row.employees?.full_name,
          department: row.employees?.department,
          designation: row.employees?.designation,
          checkIn: row.check_in,
          checkOut: row.check_out,
          worked: row.worked_minutes,
          status: row.status,
          penalty: row.penalty ? 'Yes' : 'No',
          reason: row.penalty_reason,
        });
      }

      worksheet.getRow(1).font = { bold: true };
      const buffer = await workbook.xlsx.writeBuffer();

      return new NextResponse(new Blob([buffer]), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="attendance-${from}-to-${to}.xlsx"`,
        },
      });
    }

    if (format === 'pdf') {
      const doc = new PDFDocument({ margin: 36, size: 'A4', layout: 'landscape' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));

      const done = new Promise<Buffer>((resolve, reject) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
      });

      doc.fontSize(18).text('Attendance Report');
      doc.fontSize(10).text(`Period: ${from} to ${to}`);
      doc.moveDown();

      for (const row of data) {
        doc.text(
          `${row.attendance_date} | ${row.employees?.employee_id ?? ''} | ${row.employees?.full_name ?? ''} | In ${row.check_in ?? '—'} | Out ${row.check_out ?? '—'} | ${row.worked_minutes ?? '—'} min | ${row.status} | Penalty: ${row.penalty ? 'Yes' : 'No'}`
        );

        if (doc.y > 540) {
          doc.addPage();
        }
      }

      doc.end();
      const buffer = await done;

      const pdfBytes = Uint8Array.from(buffer);

      return new NextResponse(new Blob([pdfBytes]), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="attendance-${from}-to-${to}.pdf"`,
        },
      });
    }

    return NextResponse.json({ message: 'Unsupported format' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Report failed';
    return NextResponse.json({ message }, { status: 500 });
  }
}
