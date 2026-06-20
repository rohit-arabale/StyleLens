/**
 * Firebase Admin SDK initialization.
 * Provides Firestore DB instance and Firebase Admin app reference.
 *
 * Configuration is loaded from environment variables:
 * - GOOGLE_APPLICATION_CREDENTIALS: Path to service account JSON (production)
 * - FIREBASE_PROJECT_ID: GCP Project ID
 *
 * In development, the emulator can be used via FIRESTORE_EMULATOR_HOST.
 */
import admin from "firebase-admin";
import { logger } from "../utils/logger.js";

let db = null;
let firebaseApp = null;

/**
 * Initialize Firebase Admin and Firestore.
 * Safe to call multiple times — returns cached instances.
 *
 * @returns {{ app: admin.app.App, db: admin.firestore.Firestore }}
 */
const initializeFirebase = () => {
    if (firebaseApp) {
        return { app: firebaseApp, db };
    }

    try {
        const config = {
            projectId: process.env.FIREBASE_PROJECT_ID,
        };

        // Use service account credentials if path is provided
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            const serviceAccount = JSON.parse(
                process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || "{}"
            );
            if (serviceAccount.project_id) {
                config.credential = admin.credential.cert(serviceAccount);
            }
        }

        firebaseApp = admin.initializeApp(config);
        db = admin.firestore();

        // Firestore settings
        db.settings({
            ignoreUndefinedProperties: true,
        });

        logger.info("✅ Firebase Admin initialized successfully", {
            projectId: config.projectId,
        });
    } catch (error) {
        logger.error("❌ Firebase Admin initialization failed", {
            error: error.message,
        });
        throw error;
    }

    return { app: firebaseApp, db };
};

/**
 * Get Firestore DB instance.
 * Initializes Firebase if not already done.
 *
 * @returns {admin.firestore.Firestore}
 */
const getDb = () => {
    if (!db) initializeFirebase();
    return db;
};

/**
 * Get Firebase App instance.
 *
 * @returns {admin.app.App}
 */
const getApp = () => {
    if (!firebaseApp) initializeFirebase();
    return firebaseApp;
};

export { initializeFirebase, getDb, getApp };
