// Firebase CDN initialization for FITPRO
const firebaseConfig = {
  apiKey: "AIzaSyBQNPT40XOb1IXy6VWl3EShdNQ1UiW7LW8",
  authDomain: "coach-app-5c46b.firebaseapp.com",
  projectId: "coach-app-5c46b",
  storageBucket: "coach-app-5c46b.firebasestorage.app",
  messagingSenderId: "193289362686",
  appId: "1:193289362686:web:9f00a8a07de0c41f5099af",
  measurementId: "G-M65X8XDCL3"
};

firebase.initializeApp(firebaseConfig);

window.db   = firebase.firestore();
window.auth = firebase.auth();

window.auth.onAuthStateChanged(async (user) => {
  if (user) {
    try {
      const doc = await window.db.collection('coaches').doc(user.uid).get();
      window.currentCoach = doc.exists ? { uid: user.uid, ...doc.data() } : { uid: user.uid };
    } catch (err) {
      console.error('Failed to load coach profile:', err);
      window.currentCoach = { uid: user.uid };
    }
  } else {
    window.currentCoach = null;
  }
});
