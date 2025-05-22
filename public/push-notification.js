// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAeuZD73-ASELNbSkDhchjXagCanlRh58g",
    authDomain: "akastore-project.firebaseapp.com",
    projectId: "akastore-project",
    storageBucket: "akastore-project.firebaseapp.com",
    messagingSenderId: "822761089009",
    appId: "1:822761089009:web:e609e2cc147e1e2ee10650",
    measurementId: "G-DRGKN0QM23"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// ✅ Register the service worker and wait for it to be ready
async function registerServiceWorkerAndInit() {
    // Safari Push is separate and should not use this
    if ('safari' in window && 'pushNotification' in window.safari) {
        console.log("🧭 Detected Safari. Skipping FCM setup.");
        return; // Don't do Firebase on Safari
    }

    if (!("serviceWorker" in navigator)) {
        console.error("Service Worker not supported.");
        return;
    }

    try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        console.log("✅ Service Worker registered:", registration);

        await navigator.serviceWorker.ready;
        console.log("✅ Service Worker ready");

        await requestNotificationPermission(registration);
    } catch (error) {
        console.error("❌ Service Worker registration failed:", error);
    }
}

// ✅ Request permission after Service Worker is ready
async function requestNotificationPermission(registration) {
    try {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            console.log("✅ Notification permission granted.");
            await getFCMToken(registration);
        } else {
            console.warn("🚫 Notification permission denied.");
        }
    } catch (error) {
        console.error("❌ Error requesting permission:", error);
    }
}

// ✅ Get FCM Token after Service Worker is ready and permission is granted
async function getFCMToken(registration) {
    try {
        const token = await messaging.getToken({
            vapidKey: "BBRGwhcXp_8NyN1_k7RRa4wmo4LP16DlHRxTcwdkFs6aG-X9ho3m1RXiAM3qZK1RC0XgfTKYxBmJY5mq9-6LOSg",
            serviceWorkerRegistration: registration
        });

        console.log("✅ FCM Token:", token);
        // TODO: Send token to your backend server here
    } catch (error) {
        console.error("❌ Error getting FCM token:", error);
    }
}

// ✅ Handle foreground notification
messaging.onMessage((payload) => {
    console.log("📬 Foreground message received:", payload);

    const notificationTitle = payload.notification?.title || "No Title";
    const notificationOptions = {
        body: payload.notification?.body || "No body",
        icon: "https://test.akadigital.net/logo.png",
        image: payload.notification?.image || undefined
    };

    new Notification(notificationTitle, notificationOptions);
});

// 🚀 Start everything
registerServiceWorkerAndInit();

document.getElementById('enablePush').addEventListener('click', () => {
    console.log("🔘 Button clicked");

    if ('safari' in window && 'pushNotification' in window.safari) {
      const permissionData = window.safari.pushNotification.permission('web.net.akadigital.test');
      console.log("📊 Current permission state:", permissionData.permission);

      if (permissionData.permission === 'default') {
        console.log("🟡 Requesting permission...");

        window.safari.pushNotification.requestPermission(
          'https://test.akadigital.net',
          'web.net.akadigital.test',
          { userId: '123' },
          (permission) => {
            console.log("📬 Safari permission callback:", permission);
          }
        );
      } else if (permissionData.permission === 'granted') {
        console.log("✅ Already granted:", permissionData.deviceToken);
      } else {
        console.warn("🚫 Previously denied");
      }
    } else {
      console.warn("🧭 Not Safari or no pushNotification API available.");
    }
});