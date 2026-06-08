const fs = require('fs');
const path = require('path');

// Intentar cargar variables desde .env si existe (para local)
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
}

const envConfig = {
  apiUrl: process.env.API_URL || 'http://localhost:8000/api/v1',
  aiReportUrl: process.env.AI_REPORT_URL || '',
  firebase: {
    apiKey: process.env.FIREBASE_API_KEY || '',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.FIREBASE_APP_ID || ''
  },
  vapidKey: process.env.VAPID_KEY || '',
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || ''
};

// 1. Generar src/assets/env.js
const envJsPath = path.join(__dirname, '../src/assets/env.js');
const envJsContent = `(function (global) {
  global.__env = ${JSON.stringify(envConfig, null, 2)};
})(typeof self !== "undefined" ? self : this);
`;
fs.writeFileSync(envJsPath, envJsContent);
console.log('✅ Generated src/assets/env.js');

// 2. Generar src/firebase-messaging-sw.js (para que use las mismas variables)
const swPath = path.join(__dirname, '../src/firebase-messaging-sw.js');
const swContent = `import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getMessaging, onBackgroundMessage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-sw.js";

const firebaseConfig = ${JSON.stringify(envConfig.firebase, null, 2)};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

onBackgroundMessage(messaging, (payload) => {
  console.log('[firebase-messaging-sw.js] Recibido mensaje en segundo plano: ', payload);
  const notificationTitle = payload.notification?.title || 'Nueva Notificación';
  const notificationOptions = {
    body: payload.notification?.body || 'Tienes un nuevo mensaje.',
    icon: '/favicon.ico',
    badge: '/favicon.ico'
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});
`;
fs.writeFileSync(swPath, swContent);
console.log('✅ Generated src/firebase-messaging-sw.js');
