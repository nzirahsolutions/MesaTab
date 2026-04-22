const localServer = import.meta.env.VITE_LOCAL_SERVER || "http://localhost:3500";
const cloudServer = import.meta.env.VITE_CLOUD_SERVER || "https://mesatab.onrender.com";
export const currentServer = import.meta.env.DEV ? localServer : cloudServer;
export const clientID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
// export const currentServer = "https://mesatab.onrender.com";
// export const googleClientId = "30599681861-i4urp3d6ovinjosaepd8p5gmtmb7fe30.apps.googleusercontent.com";
