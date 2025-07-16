// src/firebase/firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

let app;
let db;
let auth;

export const initializeFirebase = async () => {
    try {
        // In a real application, you would get these from environment variables or a config file
        // For this Canvas environment, we simulate the global variables.
        const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        // Attempt to sign in with custom token, fallback to anonymous
        if (initialAuthToken) {
            try {
                await signInWithCustomToken(auth, initialAuthToken);
                console.log('Signed in with custom token');
            } catch (error) {
                console.error('Error signing in with custom token:', error);
                await signInAnonymously(auth);
                console.log('Signed in anonymously (fallback)');
            }
        } else {
            await signInAnonymously(auth);
            console.log('Signed in anonymously');
        }

        return { db, auth };
    } catch (error) {
        console.error("Failed to initialize Firebase:", error);
        throw new Error("Firebase initialization failed.");
    }
};

export const getFirebaseInstances = () => {
    if (!db || !auth) {
        console.warn("Firebase not yet initialized. Call initializeFirebase first.");
    }
    return { db, auth };
};

export const getAppId = () => {
    return typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
};
