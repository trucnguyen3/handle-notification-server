// Import Firebase libraries
importScripts("https://www.gstatic.com/firebasejs/10.5.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.5.0/firebase-messaging-compat.js");

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAeuZD73-ASELNbSkDhchjXagCanlRh58g",
    authDomain: "akastore-project.firebaseapp.com",
    projectId: "akastore-project",
    storageBucket: "akastore-project.firebasestorage.app",
    messagingSenderId: "822761089009",
    appId: "1:822761089009:web:e609e2cc147e1e2ee10650",
    measurementId: "G-DRGKN0QM23"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Retrieve Firebase Messaging
const messaging = firebase.messaging();

// Handle incoming Firebase messages
messaging.onBackgroundMessage(function(payload) {
  console.log('Received background message: ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon,
  };

  // Show Firebase notification
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Safari Push Notifications - APNs Handling
self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "New Notification";
  const options = {
    body: data.body || "You have a new message.",
    icon: data.icon || 'logo.png',
    data: data.url || '/',  // Include URL data if you want to open a specific page after clicking
  };

  // Show notification to user
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  // Handle notification click (open URL, etc.)
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data)  // Open the URL stored in data
  );
});
