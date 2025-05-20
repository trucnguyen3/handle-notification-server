importScripts("https://www.gstatic.com/firebasejs/10.5.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.5.0/firebase-messaging-compat.js");

// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAeuZD73-ASELNbSkDhchjXagCanlRh58g",
    authDomain: "akastore-project.firebaseapp.com",
    projectId: "akastore-project",
    storageBucket: "akastore-project.firebasestorage.app",
    messagingSenderId: "822761089009",
    appId: "1:822761089009:web:e609e2cc147e1e2ee10650",
    measurementId: "G-DRGKN0QM23"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();