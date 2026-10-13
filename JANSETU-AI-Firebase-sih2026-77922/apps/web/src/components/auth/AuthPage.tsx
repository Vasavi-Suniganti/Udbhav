import { useState, type FormEvent } from 'react';
import { Network, ArrowRight, ArrowLeft, Mail, Lock, User, ChevronDown, Chrome, Phone, ShieldCheck, KeyRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { firebaseAuth, firebaseEnabled } from '@/lib/firebase';
import type { MainRole } from '@/types';
import { mainRoleFor } from '@/types';
import { internalRoleFor } from '@/types';
import { clearLoginWelcomePending, markLoginWelcomePending } from '@/lib/loginWelcome';

interface AuthPageProps { mode: 'signin' | 'signup'; onNavigate: (route: string) => void; }

const ROLES: { value: MainRole; label: string; description: string }[] = [
  { value: 'CITIZEN', label: 'Citizen', description: 'Report challenges and track impact in your community' },
  { value: 'VOLUNTEER', label: 'Volunteer', description:'Collect community problems directly from the community and connect them with the UDBHAV innovation ecosystem.'},
  { value: 'ACADEMIC', label: 'Academic', description: 'Join university, student, faculty and research workflows' },
  { value: 'PARTNER', label: 'Industry & Innovation Partner', description: 'Offer expertise, funding, manufacturing and deployment support' },
  { value: 'GOVERNMENT', label: 'Government', description: 'Manage validation, programs, projects and public impact' },
  
];

export default function AuthPage({ mode, onNavigate }: AuthPageProps) {
  const { signIn, signUp, googleSignIn, phoneSignIn, resetPassword, profile } = useAuth();
  const { show } = useToast();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState(''); const [role, setRole] = useState<MainRole>('CITIZEN');
  const [roleOpen, setRoleOpen] = useState(false); const [loading, setLoading] = useState(false);
  const [phoneMode, setPhoneMode] = useState(false); const [phone, setPhone] = useState('+91'); const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const isSignUp = mode === 'signup';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setLoading(true);
    const result = isSignUp ? await signUp(email, password, fullName, internalRoleFor(role), phone) : await signIn(email, password);
    setLoading(false);
    if (result.error) return show(result.error, 'error');
    if (isSignUp) {
      show(role === 'CITIZEN' ? 'Account created. Verify your email before sensitive actions.' : 'Account created. Your main role is pending administrator verification.', 'success');
      onNavigate(mainRoleFor(profile?.role||'CITIZEN')==='PLATFORM_ADMIN'?'/dashboard':'/dashboard');
    } else { markLoginWelcomePending(); show('Welcome back!', 'success'); onNavigate('/dashboard'); }
  }

  async function handleGoogle() {
    markLoginWelcomePending();
    setLoading(true); const { error } = await googleSignIn(); setLoading(false);
    if (error) {
      if (!error.includes('popup-blocked')) clearLoginWelcomePending();
      return show(error, 'error');
    }
    show('Signed in with Google.', 'success'); onNavigate('/dashboard');
  }
  async function forgot() {
    if (!email) return show('Enter your email first.', 'error');
    const { error } = await resetPassword(email); if (error) show(error, 'error'); else show('Password reset email sent.', 'success');
  }
  async function sendOtp() {
    try { setLoading(true); await firebaseAuth.startPhone(phone); setOtpSent(true); show('OTP sent to your phone.', 'success'); }
    catch (e) { show((e as Error).message, 'error'); } finally { setLoading(false); }
  }
  async function confirmOtp() {
    try { setLoading(true); const {error}=await phoneSignIn(otp); if(error)return show(error,'error'); markLoginWelcomePending(); show('Phone verified.', 'success'); onNavigate('/dashboard'); }
    catch (e) { show((e as Error).message, 'error'); } finally { setLoading(false); }
  }

  return <div className="civic-shell min-h-screen flex">
    <div className="hidden lg:flex lg:w-1/2 civic-sidebar p-12 flex-col justify-between text-white relative overflow-hidden">
      <div className="absolute top-20 right-10 w-72 h-72 bg-white/5 rounded-full blur-3xl"/><div className="absolute bottom-10 left-10 w-96 h-96 bg-secondary-400/10 rounded-full blur-3xl"/>
      <button onClick={()=>onNavigate('/')} className="relative flex items-center gap-2.5"><div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center"><Network size={20}/></div><div className="text-left"><span className="block text-base font-bold font-display">UDBHAV</span><span className="block text-[10px] text-primary-200">Societal Innovation Network</span></div></button>
      <div className="relative"><h1 className="text-3xl font-bold font-display leading-tight mb-4">From Community Problems to Deployable Solutions</h1><p className="text-primary-100 leading-relaxed max-w-md">A secure innovation operating system connecting citizens, institutions, industry and government across Jharkhand.</p><div className="mt-8 space-y-3">{['Voice, evidence and location-aware challenge reporting','AI-assisted structuring with human confirmation','Verified institution and government role workflows','Auditable project, pilot and impact lifecycle'].map(x=><div key={x} className="flex items-center gap-3 text-sm text-primary-100"><ShieldCheck size={18}/>{x}</div>)}</div></div>
      <div className="relative text-xs text-primary-300">Secure Firebase authentication and role-based access</div>
    </div>

    <div className="flex-1 flex items-center justify-center p-6 bg-[#f6f0e4]"><div className="w-full max-w-md">
      <button onClick={()=>onNavigate('/')} className="lg:hidden flex items-center gap-2 mb-8"><ArrowLeft size={16}/> UDBHAV</button>
      <h2 className="text-2xl font-bold font-display text-neutral-900">{isSignUp?'Create your account':'Welcome back'}</h2>
      <p className="text-sm text-neutral-500 mt-1.5">{isSignUp?'Citizen access is immediate; institutional and government roles require verification.':'Sign in to access your role-aware workspace.'}</p>

      {!isSignUp && firebaseEnabled && <div className="grid grid-cols-2 gap-2 mt-6"><button type="button" className="btn-secondary justify-center" onClick={handleGoogle} disabled={loading}><Chrome size={16}/> Google</button><button type="button" className="btn-secondary justify-center" onClick={()=>setPhoneMode(v=>!v)}><Phone size={16}/> Phone OTP</button></div>}
      {!isSignUp && phoneMode && firebaseEnabled ? <div className="mt-5 space-y-3 rounded-xl border border-neutral-200 p-4"><label className="label">Mobile number</label><input className="input" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+91XXXXXXXXXX"/>{otpSent&&<input className="input" value={otp} onChange={e=>setOtp(e.target.value)} placeholder="6-digit OTP"/>}<div id="recaptcha-container"/><button className="btn-primary w-full justify-center" type="button" disabled={loading} onClick={otpSent?confirmOtp:sendOtp}>{otpSent?<><KeyRound size={16}/> Verify OTP</>:<><Phone size={16}/> Send OTP</>}</button></div> : <><form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {isSignUp&&<div><label className="label">Full Name</label><div className="relative"><User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"/><input required value={fullName} onChange={e=>setFullName(e.target.value)} className="input pl-10" placeholder="Enter your full name"/></div></div>}
        {isSignUp&&<div><label className="label">Phone number</label><div className="relative"><Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"/><input required type="tel" pattern="\+[1-9][0-9]{7,14}" value={phone} onChange={e=>setPhone(e.target.value)} className="input pl-10" placeholder="+919876543210"/></div></div>}
        <div><label className="label">Email</label><div className="relative"><Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"/><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="input pl-10" placeholder="you@example.com"/></div></div>
        <div><div className="flex justify-between"><label className="label">Password</label>{!isSignUp&&firebaseEnabled&&<button type="button" onClick={forgot} className="text-xs text-primary-600 hover:underline">Forgot password?</button>}</div><div className="relative"><Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"/><input type="password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} className="input pl-10" placeholder="At least 6 characters"/></div></div>
        {isSignUp&&<div className="relative"><label className="label">Requested role</label><button type="button" onClick={()=>setRoleOpen(!roleOpen)} className="input flex items-center justify-between text-left"><span>{ROLES.find(r=>r.value===role)?.label}</span><ChevronDown size={16}/></button>{roleOpen&&<div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border bg-white shadow-elevated">{ROLES.map(r=><button key={r.value} type="button" onClick={()=>{setRole(r.value);setRoleOpen(false)}} className={`w-full text-left px-3 py-2.5 border-b last:border-0 hover:bg-neutral-50 ${role===r.value?'bg-primary-50':''}`}><div className="text-sm font-medium">{r.label}</div><div className="text-xs text-neutral-500">{r.description}</div></button>)}</div>} {role!=='CITIZEN'&&<p className="mt-2 text-xs text-amber-700 bg-amber-50 rounded-lg p-2">This role is a request only. Privileged permissions are granted after organization/government verification.</p>}</div>}
        <button type="submit" disabled={loading} className="btn-primary w-full py-3 justify-center">{loading?'Please wait…':isSignUp?'Create Account':'Sign In'}<ArrowRight size={16}/></button>
      </form></>}

      <p className="text-center text-sm text-neutral-500 mt-6">{isSignUp?'Already registered?':'New to UDBHAV?'} <button onClick={()=>onNavigate(isSignUp?'/signin':'/signup')} className="text-primary-600 font-semibold hover:underline">{isSignUp?'Sign in':'Create account'}</button></p>
    </div></div>
  </div>;
}
