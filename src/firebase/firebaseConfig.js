import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

let app;
let db;
let auth;

export const initializeFirebase = async () => {
    try {
        // Load Firebase config from environment variables (VITE_ prefix)
        const firebaseConfig = {
            apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
            authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
            projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
            storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
            appId: import.meta.env.VITE_FIREBASE_APP_ID,
            measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
        };

        const initialAuthToken = import.meta.env.VITE_INITIAL_AUTH_TOKEN || null;

        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        // Sign in using custom token if available, else fallback to anonymous
        if (initialAuthToken) {
            try {
                await signInWithCustomToken(auth, initialAuthToken);
                console.log('✅ Signed in with custom token');
            } catch (error) {
                console.error('❌ Error signing in with custom token:', error);
                await signInAnonymously(auth);
                console.log('⚠️ Signed in anonymously (fallback)');
            }
        } else {
            await signInAnonymously(auth);
            console.log('👤 Signed in anonymously');
        }

        return { db, auth };
    } catch (error) {
        console.error('🔥 Failed to initialize Firebase:', error);
        throw new Error('Firebase initialization failed.');
    }
};

export const getFirebaseInstances = () => {
    if (!db || !auth) {
        console.warn('⚠️ Firebase not yet initialized. Call initializeFirebase first.');
    }
    return { db, auth };
};

export const getAppId = () => {
    return import.meta.env.VITE_APP_ID || 'default-app-id';
};
