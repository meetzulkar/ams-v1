import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import {istDateTime,todayIST} from '@/lib/time';
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
  return `"${String(typeof value === 'string' && /^[=+@\-\t\r]/.test(value) ? "'" + value : value ?? '').replaceAll('"', '""')}"`;
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

  const rows:AttendanceRow[]=[];
  for(let offset=0;;offset+=1000){
    const {data,error}=await query.range(offset,offset+999);
    if(error)throw error;
    const batch=(data??[]) as AttendanceRow[];
    rows.push(...batch);
    if(batch.length<1000)break;
  }
  return rows;
}

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: auth.status });
  }

  const url = new URL(req.url);
  const date = url.searchParams.get('date');
  const from = url.searchParams.get('from') || date || todayIST();
  const to = url.searchParams.get('to') || from;
  const format = url.searchParams.get('format') || 'json';
  const status = url.searchParams.get('status') || undefined;
  const penaltyOnly = url.searchParams.get('penalty') === 'true';
  const employeeId = url.searchParams.get('employeeId') || undefined;

  const validDate = (value:string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10)===value;
  if(!validDate(from)||!validDate(to)||from>to) return NextResponse.json({message:'Choose a valid date range.'},{status:400});
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

    if (format === 'xls') {
      if(data.length>65535)return NextResponse.json({message:'XLS supports up to 65,535 records. Choose XLSX or a shorter date range.'},{status:400});
      const sheet=XLSX.utils.aoa_to_sheet([['Date','Employee ID','Name','Department','Designation','Check In (IST)','Check Out (IST)','Worked Minutes','Status','Penalty','Penalty Reason'],...data.map(row=>[row.attendance_date,row.employees?.employee_id??'',row.employees?.full_name??'',row.employees?.department??'',row.employees?.designation??'',row.check_in?istDateTime(row.check_in):'',row.check_out?istDateTime(row.check_out):'',row.worked_minutes??'',row.status,row.penalty?'Yes':'No',row.penalty_reason??''])]);
      sheet['!cols']=[14,18,28,20,22,28,28,18,16,12,35].map(wch=>({wch}));
      const workbook=XLSX.utils.book_new();XLSX.utils.book_append_sheet(workbook,sheet,'Attendance');
      const bytes=XLSX.write(workbook,{bookType:'biff8',type:'buffer'});
      return new NextResponse(new Blob([Uint8Array.from(bytes)]),{headers:{'Content-Type':'application/vnd.ms-excel','Content-Disposition':`attachment; filename="attendance-${from}-to-${to}.xls"`}});
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
        { header: 'Check In (IST)', key: 'checkIn', width: 24 },
        { header: 'Check Out (IST)', key: 'checkOut', width: 24 },
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
          checkIn: row.check_in ? istDateTime(row.check_in) : null,
          checkOut: row.check_out ? istDateTime(row.check_out) : null,
          worked: row.worked_minutes,
          status: row.status,
          penalty: row.penalty ? 'Yes' : 'No',
          reason: row.penalty_reason,
        });
      }

      worksheet.views=[{state:'frozen',ySplit:1}];
      worksheet.autoFilter='A1:K1';
      worksheet.getRow(1).height=30;
      worksheet.getRow(1).eachCell(cell=>{cell.font={bold:true,color:{argb:'FFFFFFFF'}};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF465DE0'}};});
      worksheet.eachRow((row,index)=>{if(index>1){row.alignment={vertical:'top',wrapText:true};if(index%2===0)row.eachCell(cell=>{cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF3F5FC'}};});}});
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

      doc.font('public/fonts/manrope.ttf');
      let page=0;
      function header(){page++;doc.fillColor('#19243a').fontSize(20).text('Attendance report',36,32);doc.fontSize(9).fillColor('#69758a').text(`${from} to ${to}  ·  ${data.length} records  ·  All times IST  ·  Page ${page}`,36,64);doc.moveTo(36,86).lineTo(805,86).strokeColor('#e7ebf2').stroke();doc.y=100;}
      header();
      if(!data.length)doc.fontSize(12).text('No attendance records match the selected filters.',36,110);
      for (const row of data) {
        const name=`${row.employees?.full_name || 'Employee'} · ${row.employees?.employee_id || ''}`;
        const details=`${row.attendance_date} · ${row.employees?.department || 'No department'} · ${row.employees?.designation || ''}`;
        const punches=`IN  ${row.check_in?istDateTime(row.check_in):'—'}     OUT  ${row.check_out?istDateTime(row.check_out):'—'}`;
        const summary=`${row.worked_minutes??0} minutes · ${row.status.replaceAll('_',' ')} · Penalty: ${row.penalty?'Yes':'No'}${row.penalty_reason?' — '+row.penalty_reason:''}`;
        const lines=[name,details,punches,summary];
        const heights=lines.map((line,index)=>doc.fontSize(index===0?11:9).heightOfString(line,{width:741}));
        const height=heights.reduce((a,b)=>a+b,0)+34;
        if(doc.y+height>555){doc.addPage();header();}
        let y=doc.y;doc.roundedRect(36,y,769,height,8).fill('#f3f5fc');y+=10;
        lines.forEach((line,index)=>{doc.fontSize(index===0?11:9).fillColor(index===0?'#19243a':'#4d5970').text(line,50,y,{width:741});y+=heights[index]+4;});
        doc.y=y+14;
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
