const host=import.meta.env.VITE_NODE_ENV;
export const currentServer=host==='development'? "http://localhost:3500":"https://mesatab.onrender.com";
// export const currentServer="https://mesatab.onrender.com";
//export const googleClientId="30599681861-i4urp3d6ovinjosaepd8p5gmtmb7fe30.apps.googleusercontent.com";