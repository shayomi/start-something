import { installStep } from './utils.js';

const DATE = new Date().toISOString().split('T')[0];

export default {
  name: 'Firebase Firestore',
  description: 'Set up Firebase Firestore — real-time NoSQL database with offline sync and auth',
  category: 'Database — NoSQL',
  supportedFrameworks: [],

  steps(context) {
    const { hasTypescript, packageManager } = context;
    const ext = hasTypescript ? 'ts' : 'js';

    const firebaseClient = hasTypescript
      ? `import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Prevent multiple app initializations (important for Next.js HMR)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
`
      : `import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Prevent multiple app initializations (important for Next.js HMR)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
`;

    const firebaseAdmin = hasTypescript
      ? `import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\\\n/g, '\\n'),
    }),
  });
}

export const adminDb = getFirestore();
`
      : `import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\\\n/g, '\\n'),
    }),
  });
}

export const adminDb = getFirestore();
`;

    const firestoreHelpers = hasTypescript
      ? `import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  DocumentData,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from './firebase';

/** Get all documents from a collection */
export async function getCollection<T = DocumentData>(
  collectionName: string,
  constraints: QueryConstraint[] = []
): Promise<(T & { id: string })[]> {
  const ref = collection(db, collectionName);
  const q = constraints.length ? query(ref, ...constraints) : ref;
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as T & { id: string }));
}

/** Get a single document by ID */
export async function getDocument<T = DocumentData>(
  collectionName: string,
  id: string
): Promise<(T & { id: string }) | null> {
  const ref = doc(db, collectionName, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as T & { id: string };
}

/** Add a new document (auto-generated ID) */
export async function addDocument(collectionName: string, data: DocumentData): Promise<string> {
  const ref = await addDoc(collection(db, collectionName), data);
  return ref.id;
}

/** Set a document with a specific ID */
export async function setDocument(collectionName: string, id: string, data: DocumentData): Promise<void> {
  await setDoc(doc(db, collectionName, id), data);
}

/** Update specific fields on a document */
export async function updateDocument(collectionName: string, id: string, data: Partial<DocumentData>): Promise<void> {
  await updateDoc(doc(db, collectionName, id), data);
}

/** Delete a document */
export async function deleteDocument(collectionName: string, id: string): Promise<void> {
  await deleteDoc(doc(db, collectionName, id));
}

export { where, orderBy, limit };
`
      : `import {
  collection, doc, getDocs, getDoc, addDoc, setDoc,
  updateDoc, deleteDoc, query, where, orderBy, limit,
} from 'firebase/firestore';
import { db } from './firebase.js';

export async function getCollection(collectionName, constraints = []) {
  const ref = collection(db, collectionName);
  const q = constraints.length ? query(ref, ...constraints) : ref;
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getDocument(collectionName, id) {
  const ref = doc(db, collectionName, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function addDocument(collectionName, data) {
  const ref = await addDoc(collection(db, collectionName), data);
  return ref.id;
}

export async function setDocument(collectionName, id, data) {
  await setDoc(doc(db, collectionName, id), data);
}

export async function updateDocument(collectionName, id, data) {
  await updateDoc(doc(db, collectionName, id), data);
}

export async function deleteDocument(collectionName, id) {
  await deleteDoc(doc(db, collectionName, id));
}

export { where, orderBy, limit };
`;

    return [
      installStep(packageManager, ['firebase']),
      installStep(packageManager, ['firebase-admin'], 'Install firebase-admin (server-side)'),
      {
        type: 'write',
        label: `Write lib/firebase.${ext}`,
        filePath: `lib/firebase.${ext}`,
        content: firebaseClient,
      },
      {
        type: 'write',
        label: `Write lib/firebase-admin.${ext}`,
        filePath: `lib/firebase-admin.${ext}`,
        content: firebaseAdmin,
      },
      {
        type: 'write',
        label: `Write lib/firestore.${ext}`,
        filePath: `lib/firestore.${ext}`,
        content: firestoreHelpers,
      },
      {
        type: 'env',
        label: 'Add Firebase env vars to .env.example',
        vars: {
          NEXT_PUBLIC_FIREBASE_API_KEY: 'your-api-key',
          NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'your-project.firebaseapp.com',
          NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'your-project-id',
          NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'your-project.appspot.com',
          NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: 'your-sender-id',
          NEXT_PUBLIC_FIREBASE_APP_ID: 'your-app-id',
          FIREBASE_PROJECT_ID: 'your-project-id',
          FIREBASE_CLIENT_EMAIL: 'firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com',
          FIREBASE_PRIVATE_KEY: '"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"',
        },
      },
      {
        type: 'doc',
        label: 'Write docs/firebase-firestore.md',
        content: docContent(DATE),
      },
    ];
  },

  nextSteps() {
    return [
      'Create a Firebase project at https://console.firebase.google.com',
      'Enable Firestore in Firebase console → Build → Firestore Database',
      'Copy your app config from Project Settings → General → Your apps',
      'For server-side: download service account JSON from Project Settings → Service Accounts',
      'Add all Firebase env vars to your .env file',
      'Use lib/firestore.js helpers for CRUD or import { db } from "@/lib/firebase" directly',
    ];
  },
};

function docContent(date) {
  return `# Firebase Firestore Setup Guide
> Generated by ai-scaffold on ${date}

## What was set up
| Item | Detail |
|------|--------|
| Packages | \`firebase\`, \`firebase-admin\` |
| \`lib/firebase.js\` | Client-side Firebase app + Firestore + Auth |
| \`lib/firebase-admin.js\` | Server-side Admin SDK (API routes, SSR) |
| \`lib/firestore.js\` | CRUD helpers: getCollection, addDocument, etc. |

## Environment Variables
| Variable | Description |
|----------|-------------|
| \`NEXT_PUBLIC_FIREBASE_*\` | Client-side config (safe to expose) |
| \`FIREBASE_PROJECT_ID\` | Service account project ID (server only) |
| \`FIREBASE_CLIENT_EMAIL\` | Service account email (server only) |
| \`FIREBASE_PRIVATE_KEY\` | Service account private key (server only, keep secret) |

## Usage

### Client-side CRUD
\`\`\`js
import { getCollection, addDocument, updateDocument, deleteDocument } from '@/lib/firestore';
import { where, orderBy } from 'firebase/firestore';

// Get all users
const users = await getCollection('users');

// Get with filters
const admins = await getCollection('users', [where('role', '==', 'admin')]);

// Add a document (auto ID)
const id = await addDocument('users', { name: 'Alice', email: 'alice@example.com' });

// Update fields
await updateDocument('users', id, { name: 'Alice Smith' });

// Delete
await deleteDocument('users', id);
\`\`\`

### Server-side (API routes / Server Components)
\`\`\`js
import { adminDb } from '@/lib/firebase-admin';

const snap = await adminDb.collection('users').get();
const users = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
\`\`\`

### Real-time listener
\`\`\`js
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const unsubscribe = onSnapshot(collection(db, 'messages'), (snap) => {
  const messages = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  setMessages(messages);
});

// Call unsubscribe() to stop listening
\`\`\`

## Security Rules
\`\`\`
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}
\`\`\`

## Production Checklist
- [ ] Set Firestore security rules (never leave in test mode for production)
- [ ] Set all NEXT_PUBLIC_FIREBASE_* vars in your hosting environment
- [ ] Set FIREBASE_PRIVATE_KEY (keep secret, server-only)
- [ ] Enable Firebase App Check to protect against abuse
- [ ] Set up Firestore indexes for complex queries

## Resources
- [Firebase Firestore Docs](https://firebase.google.com/docs/firestore)
- [Firebase Console](https://console.firebase.google.com)
- [Security Rules Guide](https://firebase.google.com/docs/firestore/security/get-started)
`;
}
