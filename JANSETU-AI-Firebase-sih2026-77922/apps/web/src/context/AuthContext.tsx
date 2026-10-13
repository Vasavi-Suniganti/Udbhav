import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {doc,getDoc,setDoc,serverTimestamp} from 'firebase/firestore';
import type {User} from 'firebase/auth';
import type {Profile,UserRole} from '@/types';
import {auth,db,firebaseAuth,firebaseEnabled,onFirebaseUser,resolveGoogleRedirect} from '@/lib/firebase';

type Session={user:{id:string;email?:string}};
interface AuthContextValue{session:Session|null;profile:Profile|null;loading:boolean;firebaseUser:User|null;signIn:(email:string,password:string)=>Promise<{error:string|null}>;signUp:(email:string,password:string,fullName:string,role:UserRole,phone:string)=>Promise<{error:string|null}>;signOut:()=>Promise<void>;refreshProfile:()=>Promise<void>;googleSignIn:()=>Promise<{error:string|null}>;phoneSignIn:(code:string)=>Promise<{error:string|null}>;resetPassword:(email:string)=>Promise<{error:string|null}>;}
const C=createContext<AuthContextValue|undefined>(undefined);
const profileFromUser=(user:User,extra:Partial<Profile>={})=>({id:user.uid,email:user.email||'',full_name:user.displayName||user.email?.split('@')[0]||'Firebase User',role:'CITIZEN' as UserRole,created_at:user.metadata.creationTime||new Date().toISOString(),updated_at:new Date().toISOString(),phone:user.phoneNumber||undefined,...extra});
function normalizedRole(role: unknown): UserRole {
 const value=String(role||'CITIZEN').toUpperCase();
 if(value==='PARTNER')return 'INDUSTRY_PARTNER';
 if(value==='ACADEMIC')return 'UNIVERSITY_ADMIN';
 if(value==='GOVERNMENT')return 'GOVERNMENT_OFFICER';
 return value as UserRole;
}
function firebaseError(error:unknown){const code=(error as {code?:string})?.code;const messages:Record<string,string>={'auth/invalid-credential':'Email or password is incorrect.','auth/popup-closed-by-user':'Google sign-in was cancelled.','auth/operation-not-allowed':'Enable this Firebase sign-in provider in the Firebase console.','auth/too-many-requests':'Too many attempts. Try again later.','auth/invalid-phone-number':'Enter a valid phone number in international format.'};return messages[code||'']||((error as Error)?.message||'Firebase authentication failed.')}
export function AuthProvider({children}:{children:ReactNode}){const[profile,setProfile]=useState<Profile|null>(null);const[session,setSession]=useState<Session|null>(null);const[firebaseUser,setFirebaseUser]=useState<User|null>(null);const[loading,setLoading]=useState(true);
 const hydrate=async(user:User|null)=>{setFirebaseUser(user);if(!user){setProfile(null);setSession(null);setLoading(false);return}const base=profileFromUser(user);let p:Profile=base;try{const stored=db?await getDoc(doc(db,'users',user.uid)):null;if(stored?.exists())p={...base,...stored.data()} as Profile;else if(db)await setDoc(doc(db,'users',user.uid),{...base,created_at:serverTimestamp(),updated_at:serverTimestamp()})}catch{p=base}setProfile({...base,...p,id:user.uid,email:user.email||p.email,role:normalizedRole(p.role)});setSession({user:{id:user.uid,email:user.email||undefined}});setLoading(false)};
 useEffect(()=>{if(!firebaseEnabled){setLoading(false);return}const unsubscribe=onFirebaseUser(user=>{void hydrate(user)});void resolveGoogleRedirect().then(result=>{if(result?.user)void hydrate(result.user)}).catch(()=>undefined);return unsubscribe},[]);
 async function signIn(email:string,password:string){try{const result=await firebaseAuth.emailLogin(email.trim(),password);await hydrate(result.user);return{error:null}}catch(e){return{error:firebaseError(e)}}}
 async function signUp(email:string,password:string,fullName:string,role:UserRole,phone:string){try{const result=await firebaseAuth.signup(email.trim(),password);const p=profileFromUser(result.user,{...(fullName?{full_name:fullName}:{}),role,...(phone?{phone}: {})});if(db)await setDoc(doc(db,'users',result.user.uid),{...p,created_at:serverTimestamp(),updated_at:serverTimestamp()});await hydrate(result.user);return{error:null}}catch(e){return{error:firebaseError(e)}}}
 async function signOut(){await firebaseAuth.logout()}
 async function refreshProfile(){if(auth?.currentUser)await hydrate(auth.currentUser)}
 async function googleSignIn(){try{const result=await firebaseAuth.google();await hydrate(result.user);return{error:null}}catch(e){return{error:firebaseError(e)}}}
 async function phoneSignIn(code:string){try{const result=await firebaseAuth.confirmPhone(code);await hydrate(result.user);return{error:null}}catch(e){return{error:firebaseError(e)}}}
 async function resetPassword(email:string){try{await firebaseAuth.reset(email);return{error:null}}catch(e){return{error:firebaseError(e)}}}
 return <C.Provider value={{session,profile,loading,firebaseUser,signIn,signUp,signOut,refreshProfile,googleSignIn,phoneSignIn,resetPassword}}>{children}</C.Provider>}
export function useAuth(){const x=useContext(C);if(!x)throw new Error('useAuth must be used within AuthProvider');return x}
