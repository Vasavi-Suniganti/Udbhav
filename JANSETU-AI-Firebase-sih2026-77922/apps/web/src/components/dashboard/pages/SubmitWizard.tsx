import { useState, useRef, useEffect, type ChangeEvent, type MouseEvent } from 'react';
import {
  Mic, Upload, MapPin, Brain, ArrowRight, ArrowLeft, Check,
  Image, Video, File, X, Loader2, Sparkles,
  AlertTriangle, Users, Clock, Calendar, ShieldAlert, Edit3,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { uploadEvidence, uploadVoiceRecording } from '@/lib/firebase';
import { usePlatform } from '@/context/PlatformContext';
import { JHARKHAND_DISTRICTS } from '@/data/demo';
import { reverseGeocodeLocation } from '@/lib/location';
import type { DomainType, IssueType } from '@/types';

const STEPS = ['Describe', 'Evidence', 'Location', 'Impact', 'AI Review'];
const DOMAINS: DomainType[] = ['Water Resources', 'Healthcare', 'Education', 'Agriculture', 'Sanitation', 'Environment', 'Energy', 'Transport', 'Rural Livelihoods', 'Digital Inclusion', 'Urban Development', 'Waste Management', 'Disaster Management', 'Accessibility', 'Skill Development', 'Public Administration', 'Other'];

interface SubmitWizardProps {
  onNavigate: (route: string) => void;
}

export default function SubmitWizard({ onNavigate }: SubmitWizardProps) {
  const { show } = useToast();
  const { profile } = useAuth();
  const { refresh } = usePlatform();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{ id: string; title: string; priority: string } | null>(null);

  // Step 1: Description
  const [description, setDescription] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [transcribing, setTranscribing] = useState(false);
  const [inputLanguage,setInputLanguage]=useState('hi');
  const [translatedText,setTranslatedText]=useState('');
  const [languageBusy,setLanguageBusy]=useState(false);
  const [voiceRecording,setVoiceRecording]=useState<Blob|null>(null);
  const [isSpeaking,setIsSpeaking]=useState(false);
  const [validationMessage,setValidationMessage]=useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Step 2: Evidence
  const [evidenceFiles, setEvidenceFiles] = useState<{ name: string; type: string; url: string; file?: File }[]>([]);

  // Step 3: Location
  const [district, setDistrict] = useState('');
  const [block, setBlock] = useState('');
  const [village, setVillage] = useState('');
  const [ward, setWard] = useState('');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({});
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'warning' | 'error'>('idle');
  const [locationMessage, setLocationMessage] = useState('');

  // Step 4: Impact
  const [affectedPopulation, setAffectedPopulation] = useState('');
  const [duration, setDuration] = useState('');
  const [frequency, setFrequency] = useState('');
  const [isSeasonal, setIsSeasonal] = useState(false);
  const [hasSafetyConcern, setHasSafetyConcern] = useState(false);

  // Step 5: AI Review
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiResult, setAiResult] = useState<{
    title: string;
    description: string;
    domain: DomainType;
    issueType: IssueType;
    confidence: number;
    requiredExpertise: string[];
    duplicateWarning: boolean;
    subdomain?: string; tags?: string[]; aiSummary?: string; duplicates?: any[];
  } | null>(null);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingTime(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  async function translateToEnglish(){if(!description.trim())return;if(inputLanguage==='en'){setTranslatedText(description);show('Already in English.','info');return}setLanguageBusy(true);try{if(inputLanguage==='sat'&&/[\u0980-\u09FF]/u.test(description))show('Santali can be written in Bengali script. The translator is detecting the script automatically.','info');if(inputLanguage==='nag'&&/[\u0900-\u097F]/u.test(description))show('Nagpuri can be written in Devanagari script. The translator is detecting the script automatically.','info');const x=await api.translate(description,'en',inputLanguage);const translated=x.translatedText||x.text;if(!translated||translated===description)throw new Error('No translation returned');setTranslatedText(translated);show('English meaning ready. Your original text is unchanged.','success')}catch{setTranslatedText('');show('Translation failed. Please try again or continue with the original language.','error')}finally{setLanguageBusy(false)}}
  function speakText(){if(!description.trim())return;if(!('speechSynthesis' in window)){show('Read aloud is not available in this browser.','error');return}if(isSpeaking){window.speechSynthesis.cancel();setIsSpeaking(false);return}const utterance=new SpeechSynthesisUtterance(description);utterance.lang=inputLanguage==='nag'?'hi-IN':inputLanguage;utterance.onend=()=>setIsSpeaking(false);utterance.onerror=()=>{setIsSpeaking(false);show('Read aloud is not available for this language on this device.','error')};window.speechSynthesis.cancel();window.speechSynthesis.speak(utterance);setIsSpeaking(true)}

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setTranscribing(true);
        try {
          const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          setVoiceRecording(blob);
          const buffer = await blob.arrayBuffer();
          let binary = '';
          const bytes = new Uint8Array(buffer);
          for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
          const result = await api.transcribe(btoa(binary), blob.type || 'audio/webm', `challenge-recording-${inputLanguage}.webm`, inputLanguage);
          const text = result.text || '';
          setTranscript(text);
          if (text) setDescription((current) => current ? `${current}\n${text}` : text);
          show(text ? 'Voice transcribed successfully' : 'Recording captured; no transcript returned.', text ? 'success' : 'info');
        } catch (error) {
          show(`Speech transcription unavailable: ${(error as Error).message}. You can continue by typing.`, 'error');
        } finally { setTranscribing(false); }
      };
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      show((error as DOMException).name === 'NotAllowedError' ? 'Microphone access was denied. You can type instead.' : 'Microphone is unavailable in this browser. You can type instead.', 'error');
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }

  function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const url = URL.createObjectURL(file);
      setEvidenceFiles((prev) => [...prev, { name: file.name, type: file.type, url, file }]);
    });
  }

  function removeFile(idx: number) {
    setEvidenceFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function applySelectedLocation(lat: number, lng: number, source: 'gps' | 'map') {
    const safeLat = Number(lat.toFixed(6));
    const safeLng = Number(lng.toFixed(6));
    setCoords({ lat: safeLat, lng: safeLng });

    try {
      const result = await reverseGeocodeLocation(safeLat, safeLng);
      if (result.district) setDistrict((current) => current || result.district);
      if (result.block) setBlock((current) => current || result.block);
      if (result.village) setVillage((current) => current || result.village);
      if (result.ward) setWard((current) => current || result.ward);
      if (result.address) setAddress((current) => current || result.address);
      show(source === 'gps' ? 'GPS location captured and reverse-geo mapped.' : 'Map pin updated and reverse-geo mapped.', 'success');
    } catch {
      show(source === 'gps' ? 'GPS location captured. Add location details manually if needed.' : 'Map pin updated. Add location details manually if needed.', 'info');
    }
  }

  function getLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          void applySelectedLocation(pos.coords.latitude, pos.coords.longitude, 'gps');
        },
        () => show('Could not get location. Please enter manually.', 'error')
      );
    }
  }

  function selectOnMap(e: MouseEvent<HTMLDivElement>) {
    const r=e.currentTarget.getBoundingClientRect(); const x=(e.clientX-r.left)/r.width, y=(e.clientY-r.top)/r.height;
    const lng=83.3+x*(87.95-83.3); const lat=25.35-y*(25.35-21.95); void applySelectedLocation(lat, lng, 'map');
  }

  async function runAIProcessing() {
    if (!description.trim()) return;
    setAiProcessing(true);
    try {
      const result = await api.challengePreview({
        description: description.trim(), district: district || profile?.district || 'Ranchi', block, village, ward, address,
        affectedPeople: Math.max(1, Number(affectedPopulation || 1)), duration: duration || 'Unknown', frequency: frequency || 'Unknown',
        seasonal: isSeasonal, safetyConcern: hasSafetyConcern, latitude: coords.lat, longitude: coords.lng, evidence: []
      });
      setAiResult({
        title: result.title, description: result.description || description, domain: result.domain, issueType: result.issueType,
        confidence: result.aiTrace?.confidence ?? result.confidence ?? 0.7, requiredExpertise: result.expertise || [],
        duplicateWarning: (result.duplicates?.length || 0) > 0, subdomain: result.subdomain, tags: result.tags || [],
        aiSummary: result.aiSummary, duplicates: result.duplicates || []
      });
    } catch (error) { show(`AI review failed: ${(error as Error).message}`, 'error'); }
    finally { setAiProcessing(false); }
  }

  function canProceed(): boolean {
    switch (step) {
      case 0: return description.trim().length > 0;
      case 1: return true;
      case 2: return district.length > 0;
      case 3: return true;
      case 4: return aiResult !== null;
      default: return false;
    }
  }

  function nextStep() {
    if (step === 0 && !description.trim()) { setValidationMessage('Please describe the problem before continuing.'); return; }
    setValidationMessage('');
    if (step === 3 && !aiResult) {
      runAIProcessing();
    }
    if (step < 4) setStep(step + 1);
  }

  function prevStep() {
    if (step > 0) setStep(step - 1);
  }

  async function submitChallenge() {
    if (!aiResult) return;
    setSubmitting(true);
    try {
      const evidence=[] as any[];
      for (const item of evidenceFiles) {
        if (item.file) evidence.push(await uploadEvidence(item.file));
      }
      const created = await api.createChallenge({
        description: description.trim(), originalText: description.trim(), originalLanguage: inputLanguage, translatedText: translatedText || (inputLanguage === 'en' ? description.trim() : undefined), district, block: block || undefined, village: village || undefined, ward: ward || undefined,
        address: address || undefined, affectedPeople: Math.max(1, Number(affectedPopulation || 1)), duration: duration || 'Unknown',
        frequency: frequency || 'Unknown', seasonal: isSeasonal, safetyConcern: hasSafetyConcern,
        latitude: coords.lat, longitude: coords.lng,
        location: {
          latitude: coords.lat ?? undefined,
          longitude: coords.lng ?? undefined,
          district: district || '',
          block: block || '',
          village: village || '',
          ward: ward || '',
          address: address || '',
        },
        evidence,
        structured: { title: aiResult.title, description: aiResult.description, domain: aiResult.domain,
          subdomain: aiResult.subdomain || aiResult.domain, issueType: aiResult.issueType,
          expertise: aiResult.requiredExpertise.length ? aiResult.requiredExpertise : ['Community Research'],
          tags: aiResult.tags || [aiResult.domain.toLowerCase().replaceAll(' ','-')], aiSummary: aiResult.aiSummary }, governmentVerificationStatus: 'PENDING', currentStage: 'REPORTED', progress: 0
      });
      if (voiceRecording) {
        const voice = await uploadVoiceRecording(voiceRecording, created.id);
        await api.updateChallenge?.(created.id, { voiceRecordingUrl: voice.url, voiceStoragePath: voice.storagePath });
      }
      await refresh();
      show('Problem submitted successfully. It is now in the government validation queue.', 'success');
      setSubmissionResult({ id: created.id, title: aiResult.title, priority: aiResult.domain });
    } catch (error) { show(`Submission failed: ${(error as Error).message}`, 'error'); }
    finally { setSubmitting(false); }
  }

  if (submissionResult) return <div className="civic-page max-w-2xl"><div className="card bg-[#fffaf0] border-[#d7d0c2] p-8 text-center"><div className="mx-auto w-14 h-14 rounded-full bg-success-100 text-success-700 flex items-center justify-center"><Check size={28}/></div><h1 className="text-2xl font-bold font-display text-primary-900 mt-4">Problem Submitted Successfully</h1><p className="text-sm text-neutral-600 mt-2">Your problem has been submitted to UDBHAV. You can track its progress from My Problems.</p><div className="rounded-xl bg-[#f6f0e4] p-4 text-left mt-6 space-y-2 text-sm"><div className="flex justify-between gap-3"><span className="text-neutral-500">Problem ID</span><b>{submissionResult.id}</b></div><div className="flex justify-between gap-3"><span className="text-neutral-500">Category</span><b>{submissionResult.priority}</b></div><div className="flex justify-between gap-3"><span className="text-neutral-500">Government status</span><b className="text-amber-700">Pending Verification</b></div></div><div className="flex flex-wrap justify-center gap-3 mt-6"><button className="btn-primary" onClick={() => onNavigate('/dashboard/my-challenges')}>View My Problems</button><button className="btn-secondary" onClick={() => { setSubmissionResult(null); setStep(0); setDescription(''); setTranslatedText(''); setVoiceRecording(null); setAiResult(null); setEvidenceFiles([]); }}>Report Another Problem</button></div></div></div>;

  return (
    <div className="civic-page max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-neutral-900">Report a Challenge</h1>
        <p className="text-sm text-neutral-500 mt-1">Submit a societal challenge through voice, text, or images. AI will help structure it.</p>
      </div>

      {/* Stepper */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  i < step ? 'bg-success-500 text-white' :
                  i === step ? 'bg-primary-600 text-white' :
                  'bg-neutral-200 text-neutral-400'
                }`}>
                  {i < step ? <Check size={16} /> : i + 1}
                </div>
                <span className={`text-xs mt-1.5 font-medium ${i === step ? 'text-primary-600' : 'text-neutral-400'}`}>{label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 -mt-5 ${i < step ? 'bg-success-500' : 'bg-neutral-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="card p-6">
        {/* Step 1: Describe */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 mb-1">Describe the Problem</h2>
              <p className="text-sm text-neutral-500">Type or record your voice. Speak in Hindi or your local language.</p>
            </div>

            <div>
              <label className="label">Problem Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder="Describe the societal challenge in your community... e.g., Hamare gaon mein baarish ke samay paani ganda ho jata hai."
                className="input resize-none"
              />
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-xs text-neutral-400">{description.length} characters</span>
                {validationMessage && <span className="text-xs text-error-600">{validationMessage}</span>}
              </div>
            </div>

            <div className="rounded-lg border border-primary-100 bg-primary-50/60 p-3 flex flex-col md:flex-row md:items-center gap-2">
              <select className="input md:max-w-[180px]" value={inputLanguage} onChange={e=>setInputLanguage(e.target.value)} aria-label="Input language"><option value="en">English</option><option value="hi">Hindi</option><option value="sat">Santali</option><option value="bn">Bengali</option><option value="ur">Urdu</option><option value="nag">Nagpuri</option></select>
              <button type="button" className="btn-secondary" disabled={languageBusy||!description.trim()} onClick={translateToEnglish}>Translate to English</button>
              <button type="button" className="btn-secondary" disabled={languageBusy||!description.trim()} onClick={speakText}>{isSpeaking ? 'Stop Reading' : 'Read Aloud'}</button>
              <span className="text-xs text-neutral-500">Provider adapters support translation and TTS without coupling the workflow to one AI vendor.</span>
            </div>
            {description&&<div className="grid md:grid-cols-2 gap-3"><div className="rounded-lg bg-white/60 border border-neutral-200 p-3"><p className="text-xs font-semibold text-neutral-600">Original Text ({inputLanguage})</p><p className="text-sm text-neutral-700 mt-1 whitespace-pre-wrap">{description}</p></div>{translatedText&&<div className="rounded-lg bg-secondary-50/60 border border-secondary-100 p-3"><p className="text-xs font-semibold text-secondary-700">English Meaning</p><p className="text-sm text-neutral-700 mt-1">{translatedText}</p><p className="text-[11px] text-secondary-700 mt-2">Meaning translated to English, not transliterated.</p></div>}</div>}

            {/* Voice recording */}
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Mic size={18} className="text-primary-600" />
                  <span className="text-sm font-medium text-neutral-700">Voice Input</span>
                </div>
                {!isRecording && !transcribing && (
                  <button onClick={startRecording} className="btn-secondary text-sm py-2">
                    <Mic size={16} /> Start Recording
                  </button>
                )}
                {isRecording && (
                  <button onClick={stopRecording} className="btn-danger text-sm py-2">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> Stop ({Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')})
                  </button>
                )}
              </div>

              {isRecording && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    {[...Array(20)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-primary-500 rounded-full animate-pulse"
                        style={{ height: `${Math.random() * 20 + 8}px`, animationDelay: `${i * 0.05}s` }}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-neutral-500 ml-2">Recording...</span>
                </div>
              )}

              {transcribing && (
                <div className="flex items-center gap-2 text-sm text-primary-600">
                  <Loader2 size={16} className="animate-spin" /> Transcribing audio...
                </div>
              )}

              {transcript && !transcribing && !isRecording && (
                <div className="mt-2 rounded-lg bg-white border border-neutral-200 p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Sparkles size={14} className="text-primary-600" />
                    <span className="text-xs font-semibold text-primary-700">AI Transcription ({inputLanguage})</span>
                  </div>
                  <p className="text-sm text-neutral-700 italic">{transcript}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Evidence */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 mb-1">Add Evidence</h2>
              <p className="text-sm text-neutral-500">Upload photos, videos, or documents that show the problem.</p>
            </div>

            <label className="block">
              <div className="border-2 border-dashed border-neutral-300 rounded-xl p-8 text-center hover:border-primary-400 hover:bg-primary-50/30 transition-colors cursor-pointer">
                <Upload size={32} className="mx-auto text-neutral-400 mb-3" />
                <p className="text-sm font-medium text-neutral-700">Click to upload or drag files here</p>
                <p className="text-xs text-neutral-400 mt-1">Images, videos, documents — up to 50MB each</p>
                <input type="file" multiple className="hidden" onChange={handleFileUpload} accept="image/*,video/*,application/pdf" />
              </div>
            </label>

            {evidenceFiles.length > 0 && (
              <div className="space-y-2">
                <span className="text-sm font-medium text-neutral-700">{evidenceFiles.length} file(s) attached</span>
                {evidenceFiles.map((file, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-neutral-200">
                    <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-500">
                      {file.type.startsWith('image/') ? <Image size={18} /> :
                       file.type.startsWith('video/') ? <Video size={18} /> :
                       <File size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 truncate">{file.name}</p>
                      <p className="text-xs text-neutral-400">{file.type || 'Unknown type'}</p>
                    </div>
                    <button onClick={() => removeFile(i)} className="p-1.5 rounded-lg hover:bg-error-50 text-error-500">
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                AI-assisted image analysis will identify visible context (waterlogging, road damage, etc.) but will be labeled as "AI-assisted evidence analysis" — not authoritative proof.
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Location */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 mb-1">Location</h2>
              <p className="text-sm text-neutral-500">Where is this challenge located? Use GPS or enter manually.</p>
            </div>

            <button onClick={getLocation} className="btn-secondary w-full py-3">
              <MapPin size={18} /> Use My Current Location (GPS)
            </button>

            {coords.lat != null && coords.lng != null && (
              <div className="rounded-lg bg-success-50 border border-success-200 p-3 flex items-center gap-2">
                <Check size={16} className="text-success-600" />
                <span className="text-sm text-success-800">Location captured: {coords.lat?.toFixed(4)}, {coords.lng?.toFixed(4)}</span>
              </div>
            )}

            {locationMessage && (
              <div className={`rounded-lg border p-3 text-xs ${
                locationStatus === 'success' ? 'bg-success-50 border-success-200 text-success-800' :
                locationStatus === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                locationStatus === 'error' ? 'bg-error-50 border-error-200 text-error-700' :
                'bg-neutral-50 border-neutral-200 text-neutral-600'}
              `}>{locationMessage}</div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">District *</label>
                <select value={district} onChange={(e) => setDistrict(e.target.value)} className="input">
                  <option value="">Select district</option>
                  {JHARKHAND_DISTRICTS.map((d) => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Block</label>
                <input value={block} onChange={(e) => setBlock(e.target.value)} placeholder="e.g., Angara" className="input" />
              </div>
              <div>
                <label className="label">Village</label>
                <input value={village} onChange={(e) => setVillage(e.target.value)} placeholder="e.g., Hutwa" className="input" />
              </div>
              <div>
                <label className="label">Ward (if urban)</label>
                <input value={ward} onChange={(e) => setWard(e.target.value)} placeholder="Ward number" className="input" />
              </div>
            </div>

            <div>
              <label className="label">Address (optional)</label>
              <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} placeholder="Complete address or landmark" className="input resize-none" />
            </div>

            <div className="space-y-2">
              <p className="text-xs text-neutral-500">Click anywhere on the Jharkhand map to place or adjust the challenge pin. GPS remains optional.</p>
              <div className="relative h-64 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 cursor-crosshair" onClick={selectOnMap} role="application" aria-label="Jharkhand location pin selector">
                <iframe title="Jharkhand OpenStreetMap" className="absolute inset-0 w-full h-full pointer-events-none" loading="lazy" src="https://www.openstreetmap.org/export/embed.html?bbox=83.3%2C21.95%2C87.95%2C25.35&layer=mapnik" />
                {coords.lat!=null&&coords.lng!=null&&<div className="absolute -translate-x-1/2 -translate-y-full text-error-600 drop-shadow" style={{left:`${((coords.lng-83.3)/(87.95-83.3))*100}%`,top:`${((25.35-coords.lat)/(25.35-21.95))*100}%`}}><MapPin size={30} fill="currentColor" /></div>}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Impact */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 mb-1">Impact Assessment</h2>
              <p className="text-sm text-neutral-500">Help us understand the scale and urgency of this challenge.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label flex items-center gap-2"><Users size={14} /> How many people are affected?</label>
                <input type="number" value={affectedPopulation} onChange={(e) => setAffectedPopulation(e.target.value)} placeholder="Approximate number" className="input" />
              </div>

              <div>
                <label className="label flex items-center gap-2"><Clock size={14} /> How long has this existed?</label>
                <select value={duration} onChange={(e) => setDuration(e.target.value)} className="input">
                  <option value="">Select duration</option>
                  <option value="Less than 1 month">Less than 1 month</option>
                  <option value="1-6 months">1-6 months</option>
                  <option value="6-12 months">6-12 months</option>
                  <option value="1-2 years">1-2 years</option>
                  <option value="More than 2 years">More than 2 years</option>
                  <option value="Chronic">Chronic / Always existed</option>
                </select>
              </div>

              <div>
                <label className="label flex items-center gap-2"><Calendar size={14} /> How often does it happen?</label>
                <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className="input">
                  <option value="">Select frequency</option>
                  <option value="One-time incident">One-time incident</option>
                  <option value="Occasionally">Occasionally</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Daily">Daily</option>
                  <option value="Seasonal (Monsoon)">Seasonal (Monsoon)</option>
                  <option value="Continuous">Continuous / Always</option>
                </select>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <label className="flex items-center gap-3 p-3 rounded-lg border border-neutral-200 cursor-pointer hover:bg-neutral-50">
                  <input type="checkbox" checked={isSeasonal} onChange={(e) => setIsSeasonal(e.target.checked)} className="w-4 h-4 rounded text-primary-600" />
                  <span className="text-sm text-neutral-700">Is this seasonal?</span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg border border-neutral-200 cursor-pointer hover:bg-neutral-50">
                  <input type="checkbox" checked={hasSafetyConcern} onChange={(e) => setHasSafetyConcern(e.target.checked)} className="w-4 h-4 rounded text-primary-600" />
                  <span className="text-sm text-neutral-700 flex items-center gap-1.5">
                    <ShieldAlert size={14} className="text-error-500" /> Immediate health/safety concern?
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: AI Review */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 mb-1">AI Review</h2>
              <p className="text-sm text-neutral-500">AI has structured your submission. Review and edit before final submission.</p>
            </div>

            {aiProcessing && (
              <div className="py-12 text-center">
                <Loader2 size={32} className="mx-auto text-primary-600 animate-spin mb-4" />
                <p className="text-sm font-medium text-neutral-700">AI is processing your submission...</p>
                <p className="text-xs text-neutral-400 mt-1">Running: Moderation → Language Detection → Transcription → Structuring → Classification → Expertise Extraction</p>
              </div>
            )}

            {!aiProcessing && aiResult && (
              <div className="space-y-4">
                <div className="rounded-lg bg-primary-50 border border-primary-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Brain size={18} className="text-primary-600" />
                      <span className="text-sm font-semibold text-primary-800">AI-Generated Challenge</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="badge bg-white text-primary-700 border border-primary-200">
                        {Math.round(aiResult.confidence * 100)}% confidence
                      </span>
                      <button onClick={() => setEditMode(!editMode)} className="btn-ghost text-xs py-1 px-2">
                        <Edit3 size={12} /> {editMode ? 'Done' : 'Edit'}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className="text-xs font-semibold text-primary-700">Title</span>
                      {editMode ? (
                        <input value={aiResult.title} onChange={(e) => setAiResult({ ...aiResult, title: e.target.value })} className="input mt-1" />
                      ) : (
                        <p className="text-sm text-neutral-900 mt-0.5 font-medium">{aiResult.title}</p>
                      )}
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-primary-700">Structured Description</span>
                      {editMode ? (
                        <textarea value={aiResult.description} onChange={(e) => setAiResult({ ...aiResult, description: e.target.value })} rows={3} className="input mt-1 resize-none" />
                      ) : (
                        <p className="text-sm text-neutral-700 mt-0.5 leading-relaxed">{aiResult.description}</p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs font-semibold text-primary-700">Domain</span>
                        <p className="text-sm text-neutral-900 mt-0.5">{aiResult.domain}</p>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-primary-700">Issue Type</span>
                        <p className="text-sm text-neutral-900 mt-0.5">{aiResult.issueType.replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-primary-700">Required Expertise</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {aiResult.requiredExpertise.map((e) => (
                          <span key={e} className="badge bg-white text-primary-700 border border-primary-200">{e}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {aiResult.duplicateWarning && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
                    <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-amber-900">Potential Duplicate Detected</p>
                      <p className="text-xs text-amber-700 mt-0.5">AI found 2 similar challenges in your district. Government officials will review and may merge them into a cluster for greater impact.</p>
                    </div>
                  </div>
                )}

                <div className="rounded-lg bg-neutral-50 border border-neutral-200 p-4">
                  <span className="text-xs font-semibold text-neutral-700">Submission Summary</span>
                  <div className="mt-2 space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-neutral-500">District</span><span className="text-neutral-900 font-medium">{district}</span></div>
                    {block && <div className="flex justify-between"><span className="text-neutral-500">Block</span><span className="text-neutral-900 font-medium">{block}</span></div>}
                    {village && <div className="flex justify-between"><span className="text-neutral-500">Village</span><span className="text-neutral-900 font-medium">{village}</span></div>}
                    {affectedPopulation && <div className="flex justify-between"><span className="text-neutral-500">Affected</span><span className="text-neutral-900 font-medium">{parseInt(affectedPopulation).toLocaleString('en-IN')} people</span></div>}
                    <div className="flex justify-between"><span className="text-neutral-500">Evidence files</span><span className="text-neutral-900 font-medium">{evidenceFiles.length}</span></div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <Check size={14} className="text-success-500" />
                  By submitting, you confirm this challenge is accurate to the best of your knowledge.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-neutral-100">
          <button onClick={prevStep} disabled={step === 0} className="btn-secondary">
            <ArrowLeft size={16} /> Back
          </button>

          {step < 4 ? (
            <button onClick={nextStep} disabled={!canProceed()} className="btn-primary">
              {step === 3 ? 'Run AI Review' : 'Continue'}
              <ArrowRight size={16} />
            </button>
          ) : (
            <button onClick={submitChallenge} disabled={!aiResult || submitting} className="btn-primary">
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <Check size={16} /> Submit Challenge
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

