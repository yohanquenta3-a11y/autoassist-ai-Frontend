declare global {
  interface Window {
    __env?: {
      apiUrl?: string;
      aiReportUrl?: string;
      firebase?: {
        apiKey?: string;
        authDomain?: string;
        projectId?: string;
        storageBucket?: string;
        messagingSenderId?: string;
        appId?: string;
      };
      vapidKey?: string;
      googleMapsApiKey?: string;
    };
  }
}

const runtimeEnv = (typeof window !== "undefined" && window.__env) ? window.__env : {};

export const environment = {
  production: true,
  apiUrl: runtimeEnv.apiUrl || "https://autoassist-ai-backend-1.onrender.com/api/v1",
  aiReportUrl: runtimeEnv.aiReportUrl || "https://assistcar.app.n8n.cloud/webhook/chat",
  firebase: runtimeEnv.firebase || {
    apiKey: "AIzaSyDUYtfJfmsVk-cFhZh6CyqebSOV2wEb73s",
    authDomain: "autoassist-ai-b21e2.firebaseapp.com",
    projectId: "autoassist-ai-b21e2",
    storageBucket: "autoassist-ai-b21e2.firebasestorage.app",
    messagingSenderId: "562437926370",
    appId: "1:562437926370:android:a1a055fd05b6795f6f1dbb"
  },
  vapidKey: runtimeEnv.vapidKey || "BDOU99-h67HcA6JeFXHbSNMu7e2yNNu3RzoMj8TM4W88jITfq7ZmPvIM1Iv-4_l2LxQcYwhqby2xGpWwzjfAnG4",
  googleMapsApiKey: runtimeEnv.googleMapsApiKey || "AIzaSyDUYtfJfmsVk-cFhZh6CyqebSOV2wEb73s"
};
