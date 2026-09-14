import {recordAttendance} from '@/lib/attendance';
export async function POST(req:Request){return recordAttendance(req,'checkout')}
