const runtimeEnv = (typeof window !== "undefined" && window.__env) ? window.__env : {};

export const environment = {
  production: true,
  apiUrl: runtimeEnv.apiUrl || "",
  aiReportUrl: runtimeEnv.aiReportUrl || "/ai-report",
  firebase: runtimeEnv.firebase || {},
  vapidKey: runtimeEnv.vapidKey || "",
  googleMapsApiKey: runtimeEnv.googleMapsApiKey || ""
};
