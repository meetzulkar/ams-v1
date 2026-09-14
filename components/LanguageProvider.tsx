'use client';
import {createContext,useContext,useEffect,useState} from 'react';
export type PublicLanguage='en'|'kn'|'hi';
const LanguageContext=createContext<{language:PublicLanguage;setLanguage:(language:PublicLanguage)=>void}>({language:'en',setLanguage:()=>{}});
export function LanguageProvider({children}:{children:React.ReactNode}){const [language,setLanguageState]=useState<PublicLanguage>('en');useEffect(()=>{const saved=localStorage.getItem('attendance-language');if(saved==='en'||saved==='kn'||saved==='hi'){setLanguageState(saved);document.documentElement.lang=saved}},[]);function setLanguage(next:PublicLanguage){setLanguageState(next);localStorage.setItem('attendance-language',next);document.documentElement.lang=next}return <LanguageContext.Provider value={{language,setLanguage}}>{children}</LanguageContext.Provider>}
export function usePublicLanguage(){return useContext(LanguageContext)}
