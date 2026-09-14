'use client';
import {Languages} from 'lucide-react';
import {usePublicLanguage,type PublicLanguage} from './LanguageProvider';
export default function LanguageSelector(){const {language,setLanguage}=usePublicLanguage();return <label className="languageSelector"><Languages size={16}/><span className="srOnly">Select language</span><select value={language} onChange={event=>setLanguage(event.target.value as PublicLanguage)} aria-label="Select language"><option value="en">English</option><option value="kn">ಕನ್ನಡ</option><option value="hi">हिन्दी</option></select></label>}
