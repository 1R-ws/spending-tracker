import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: "AIzaSyCUgTCIkofCEMUpaRTxr7-Lt3Xy6Md7wJw",
  authDomain: "spending-tracker-4b3e5.firebaseapp.com",
  projectId: "spending-tracker-4b3e5",
  storageBucket: "spending-tracker-4b3e5.firebasestorage.app",
  messagingSenderId: "307750418023",
  appId: "1:307750418023:web:ad54505d8bdfaa6235c6c2"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const storage = getStorage(app)