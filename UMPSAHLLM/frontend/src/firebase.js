import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCEN8Vn791ezanH_MgzHJcA_PyLOMjJiEA",
  authDomain: "umpsahllm.firebaseapp.com",
  projectId: "umpsahllm",
  storageBucket: "umpsahllm.firebasestorage.app",
  messagingSenderId: "302781919950",
  appId: "1:302781919950:web:04a8a6db414729c132d69f"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export default app;
