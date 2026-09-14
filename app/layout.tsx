import './globals.css';
import localFont from 'next/font/local';
import type {Metadata,Viewport} from 'next';
const manrope=localFont({src:'../public/fonts/manrope.ttf',variable:'--font-body',display:'swap',weight:'200 800'});
export const metadata:Metadata={title:'Attendance Pro',description:'A clearer workday. Modern employee attendance and team management.'};
export const viewport:Viewport={width:'device-width',initialScale:1,themeColor:'#f6f8fb'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" className={manrope.variable}><body>{children}</body></html>}
