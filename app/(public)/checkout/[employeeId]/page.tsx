import PublicShell from '@/components/PublicShell';
import AttendanceForm from '@/components/AttendanceForm';
export default async function Page({params}:{params:Promise<{employeeId:string}>}){const {employeeId}=await params;return <PublicShell><AttendanceForm mode="checkout" employeeId={employeeId} stage="details"/></PublicShell>}
