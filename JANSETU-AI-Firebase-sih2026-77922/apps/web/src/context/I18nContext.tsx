import {createContext,useContext,useMemo,useState,type ReactNode} from 'react';
export type Locale='en'|'hi'|'sat'|'bn'|'ur'|'nag';
const dictionary:Record<Locale,Record<string,string>>={
 en:{overview:'Overview',challenges:'Challenges',projects:'Projects',solutions:'Solutions',map:'Innovation Map',impact:'Impact',notifications:'Notifications',search:'Search',settings:'Settings',reportNew:'Report New',marketplace:'Marketplace',teams:'Teams',faculty:'Faculty',collaborations:'Collaborations',csr:'CSR Marketplace',validation:'Validation Queue',clusters:'Clusters',analytics:'Analytics',users:'Users',organizations:'Organizations',admin:'Admin Panel',health:'System Health',jobs:'AI Jobs',configuration:'Configuration'},
 hi:{overview:'अवलोकन',challenges:'चुनौतियाँ',projects:'परियोजनाएँ',solutions:'समाधान',map:'नवाचार मानचित्र',impact:'प्रभाव',notifications:'सूचनाएँ',search:'खोज',settings:'सेटिंग्स',reportNew:'नई चुनौती दर्ज करें',marketplace:'चुनौती बाज़ार',teams:'टीमें',faculty:'संकाय',collaborations:'सहयोग',csr:'सीएसआर बाज़ार',validation:'सत्यापन कतार',clusters:'क्लस्टर',analytics:'विश्लेषण',users:'उपयोगकर्ता',organizations:'संस्थाएँ',admin:'प्रशासन',health:'सिस्टम स्वास्थ्य',jobs:'एआई कार्य',configuration:'कॉन्फ़िगरेशन'},
 sat:{overview:'ᱚᱞᱟᱜ',challenges:'ᱪᱮᱞᱮᱧᱡ',projects:'ᱯᱨᱚᱡᱮᱠᱴ',solutions:'ᱥᱚᱞᱩᱥᱚᱱ',map:'ᱱᱚᱵᱚᱪᱟᱨ ᱢᱮᱯ',impact:'ᱯᱨᱚᱵᱷᱟᱵ',notifications:'ᱠᱷᱚᱵᱚᱨ',search:'ᱯᱟᱱᱛᱮ',settings:'ᱥᱮᱴᱤᱝ'},
 bn:{overview:'সংক্ষিপ্তসার',challenges:'চ্যালেঞ্জ',projects:'প্রকল্প',solutions:'সমাধান',map:'উদ্ভাবন মানচিত্র',impact:'প্রভাব',notifications:'বিজ্ঞপ্তি',search:'অনুসন্ধান',settings:'সেটিংস'},
 ur:{overview:'جائزہ',challenges:'چیلنجز',projects:'منصوبے',solutions:'حل',map:'جدت کا نقشہ',impact:'اثر',notifications:'اطلاعات',search:'تلاش',settings:'ترتیبات'},
 nag:{overview:'सार',challenges:'चुनौती',projects:'परियोजना',solutions:'उपाय',map:'नवाचार नक्शा',impact:'असर',notifications:'सूचना',search:'खोज',settings:'सेटिंग'}
};
type Value={locale:Locale;setLocale:(l:Locale)=>void;t:(key:string,fallback?:string)=>string};
const C=createContext<Value|undefined>(undefined);
export function I18nProvider({children}:{children:ReactNode}){const[locale,setLocaleState]=useState<Locale>(()=>(localStorage.getItem('jansetu-locale') as Locale)||'en');const setLocale=(l:Locale)=>{localStorage.setItem('jansetu-locale',l);document.documentElement.lang=l;document.documentElement.dir=l==='ur'?'rtl':'ltr';setLocaleState(l)};const value=useMemo(()=>({locale,setLocale,t:(key:string,fallback?:string)=>dictionary[locale]?.[key]||dictionary.en[key]||fallback||key}),[locale]);return <C.Provider value={value}>{children}</C.Provider>}
export function useI18n(){const x=useContext(C);if(!x)throw new Error('useI18n must be used within I18nProvider');return x}
export const localeOptions:[Locale,string][]=[['en','English'],['hi','हिन्दी'],['sat','Santali'],['bn','বাংলা'],['ur','اردو'],['nag','Nagpuri']];
