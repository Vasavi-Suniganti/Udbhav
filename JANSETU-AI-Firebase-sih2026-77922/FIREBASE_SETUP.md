# Firebase setup

The web client can use Firebase Authentication, Cloud Firestore, and Cloud Storage. Firebase is optional for exploring the public UI and bundled showcase data; authentication and cloud persistence require your own Firebase project.

1. Copy `apps/web/.env.example` to `apps/web/.env.local` and fill in the Firebase web-app configuration from your Firebase console.
2. Sign in to Firebase CLI:

   ```sh
   npx firebase-tools login
   ```

3. In Firebase Console, enable only the authentication providers you intend to use (the client supports Email/Password, Google, and Phone), then add local and deployed origins under Authentication > Settings > Authorized domains.
4. Review `firestore.rules`, `firestore.indexes.json`, and `storage.rules` for your data model and user roles before deploying. From the repository root, target your own project explicitly:

   ```sh
   npm run firebase:deploy --prefix JANSETU-AI-Firebase-sih2026-77922 -- --project YOUR_FIREBASE_PROJECT_ID
   ```

Do not put Firebase Admin service-account JSON or private keys in this frontend repository. Firebase web-app configuration is client-visible; use your own project values, restrict the API key and authorized domains, and rely on carefully reviewed Security Rules for access control.
