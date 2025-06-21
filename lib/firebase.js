// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBpTeJkBifmglIzCIcR453sU65KoWikWFA",
  authDomain: "ff-app-d365c.firebaseapp.com",
  projectId: "ff-app-d365c",
  storageBucket: "ff-app-d365c.firebasestorage.app",
  messagingSenderId: "934031542853",
  appId: "1:934031542853:web:dad0fbd6e8c388e014312c",
  measurementId: "G-82NG8MCMRN"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;