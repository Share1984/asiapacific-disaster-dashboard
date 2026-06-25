import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let firestoreInstance: Firestore | null = null;
let initError: Error | null = null;

function parseServiceAccountJson(): Record<string, unknown> | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON is set but is not valid JSON.",
    );
  }
}

export function getFirestoreAdmin(): Firestore {
  if (firestoreInstance) {
    return firestoreInstance;
  }

  if (initError) {
    throw initError;
  }

  try {
    if (!getApps().length) {
      const serviceAccount = parseServiceAccountJson();
      const projectId =
        process.env.FIREBASE_PROJECT_ID ??
        process.env.GCLOUD_PROJECT ??
        "emdatdashboard";

      if (serviceAccount) {
        initializeApp({
          credential: cert(serviceAccount),
          projectId,
        });
      } else {
        initializeApp({
          credential: applicationDefault(),
          projectId,
        });
      }
    }

    firestoreInstance = getFirestore();
    return firestoreInstance;
  } catch (error) {
    initError =
      error instanceof Error
        ? error
        : new Error("Failed to initialize Firestore.");
    throw initError;
  }
}
