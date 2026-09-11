/* ---------------------------------------------------------
   CONFIGURACIÓN DE FIREBASE
   ---------------------------------------------------------
   1. Ve a https://console.firebase.google.com y crea un proyecto
      (gratis).
   2. Dentro del proyecto: "Compilación" > "Firestore Database" >
      "Crear base de datos" (elige modo "producción").
   3. Ve a "Configuración del proyecto" (ícono de engranaje) >
      pestaña "General" > baja hasta "Tus apps" > agrega una app
      "Web" (ícono </>). Al registrarla, Firebase te muestra un
      objeto firebaseConfig como el de abajo.
   4. Copia esos valores y reemplaza los que están aquí.
   5. Ve a Firestore > pestaña "Reglas" y pega las reglas que te
      dejé en el archivo REGLAS-FIRESTORE.txt, luego "Publicar".
   --------------------------------------------------------- */

const firebaseConfig = {
  apiKey: "AIzaSyCmokSeQWMJCRqZcrAfjZVrs0s-sikxjJE",
  authDomain: "rifas-dff31.firebaseapp.com",
  projectId: "rifas-dff31",
  storageBucket: "rifas-dff31.firebasestorage.app",
  messagingSenderId: "922636387926",
  appId: "1:922636387926:web:23dd4ff77b46bb17dc1df7",
  measurementId: "G-W6YFRR3X3E"
};

// No toques nada de aquí para abajo
try {
  firebase.initializeApp(firebaseConfig);
  window.db = firebase.firestore();
} catch (e) {
  console.warn('Firebase no se pudo inicializar todavía (revisa firebase-config.js o tu conexión a internet):', e.message);
}
