import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";



// const firebaseConfig = {
//   apiKey: "**",
//   authDomain: "**",
//   projectId: "**",
//   storageBucket: "**",
//   messagingSenderId: "**",
//   appId: "**",
//   measurementId: "**"
// };

//Initialize Firebase only if it hasn't been initialized yet
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const initializeAnalytics = async () => {
  try {
    const analyticsSupported = await isSupported();
    return analyticsSupported ? getAnalytics(app) : null;
  } catch (error) {
    console.log('Analytics initialization failed:', error);
    return null;
  }
};

export { app, initializeAnalytics };
