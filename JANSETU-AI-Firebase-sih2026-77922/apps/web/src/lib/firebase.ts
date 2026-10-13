import { getAnalytics, isSupported as analyticsSupported, type Analytics } from 'firebase/analytics';
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { ConfirmationResult, createUserWithEmailAndPassword, getAuth, GoogleAuthProvider, onAuthStateChanged, RecaptchaVerifier, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPhoneNumber, signInWithPopup, signOut, type Auth, type User } from 'firebase/auth';
import { getRedirectResult, signInWithRedirect } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes, type FirebaseStorage } from 'firebase/storage';
import type { Evidence } from '@jansetu/shared';

const config = {
	apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
	authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
	projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
	storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
	appId: import.meta.env.VITE_FIREBASE_APP_ID,
	measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const firebaseEnabled = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
export const app: FirebaseApp | undefined = firebaseEnabled ? (getApps()[0] || initializeApp(config)) : undefined;
export const auth: Auth | undefined = app ? getAuth(app) : undefined;
export const db: Firestore | undefined = app ? getFirestore(app) : undefined;
export const storage: FirebaseStorage | undefined = app ? getStorage(app) : undefined;
export const analyticsPromise: Promise<Analytics | undefined> = app && config.measurementId
	? analyticsSupported().then(supported => supported ? getAnalytics(app) : undefined)
	: Promise.resolve(undefined);

let phoneConfirmation: ConfirmationResult | null = null;
let recaptcha: RecaptchaVerifier | null = null;
const requireAuth = () => {
	if (!auth) throw new Error('Firebase is not configured. Add VITE_FIREBASE_* variables.');
	return auth;
};

export const firebaseAuth = {
	emailLogin: (email: string, password: string) => signInWithEmailAndPassword(requireAuth(), email, password),
	signup: (email: string, password: string) => createUserWithEmailAndPassword(requireAuth(), email, password),
	google: async () => {
		try { return await signInWithPopup(requireAuth(), new GoogleAuthProvider()); }
		catch (error) {
			const code = (error as { code?: string }).code;
			if (code === 'auth/popup-blocked' || code === 'auth/popup-closed-by-user') {
				await signInWithRedirect(requireAuth(), new GoogleAuthProvider());
			}
			throw error;
		}
	},
	reset: (email: string) => sendPasswordResetEmail(requireAuth(), email),
	resendVerification: (user: User) => sendEmailVerification(user),
	startPhone: async (phone: string, containerId = 'recaptcha-container') => {
		if (!auth) throw new Error('Firebase is not configured.');
		recaptcha?.clear();
		recaptcha = new RecaptchaVerifier(auth, containerId, { size: 'invisible' });
		phoneConfirmation = await signInWithPhoneNumber(auth, phone, recaptcha);
	},
	confirmPhone: async (code: string) => {
		if (!phoneConfirmation) throw new Error('Request an OTP first.');
		const result = await phoneConfirmation.confirm(code);
		phoneConfirmation = null;
		recaptcha?.clear();
		recaptcha = null;
		return result;
	},
	logout: () => signOut(requireAuth()),
};

export function onFirebaseUser(callback: (user: User | null) => void) {
	return auth ? onAuthStateChanged(auth, callback) : () => undefined;
}

export async function resolveGoogleRedirect() {
	return auth ? getRedirectResult(auth) : null;
}

function evidenceType(file: File): Evidence['type'] { if (file.type.startsWith('image/')) return 'image'; if (file.type.startsWith('video/')) return 'video'; if (file.type.startsWith('audio/')) return 'audio'; return 'document'; }
export async function uploadEvidence(file: File, scope = 'challenge-evidence'): Promise<Evidence> {
	if (!storage || !auth?.currentUser) return { id: crypto.randomUUID(), type: evidenceType(file), name: file.name, url: URL.createObjectURL(file), mimeType: file.type, size: file.size, uploadedAt: new Date().toISOString() };
	const path = `${scope}/${auth.currentUser.uid}/${crypto.randomUUID()}-${file.name}`;
	const uploaded = await uploadBytes(ref(storage, path), file, { contentType: file.type || 'application/octet-stream' });
	return { id: uploaded.metadata.generation, type: evidenceType(file), name: file.name, url: await getDownloadURL(uploaded.ref), storagePath: path, mimeType: file.type, size: file.size, uploadedAt: new Date().toISOString() };
}

export async function uploadVoiceRecording(blob: Blob, problemId: string): Promise<{ url: string; storagePath?: string }> {
	if (!storage || !auth?.currentUser) return { url: URL.createObjectURL(blob) };
	const path = `problem-reports/${auth.currentUser.uid}/${problemId}/voice/recording.webm`;
	const uploaded = await uploadBytes(ref(storage, path), blob, { contentType: blob.type || 'audio/webm' });
	return { url: await getDownloadURL(uploaded.ref), storagePath: path };
}

export async function registerPushToken() {
	throw new Error('Push notifications require a VAPID key in VITE_FIREBASE_VAPID_KEY and a Firebase messaging service worker.');
}

export async function appCheckHeader() { return {}; }
