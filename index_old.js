const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require('fs');
const app = express();
app.use(bodyParser.json());

const { execSync } = require("child_process");

//FCM
const admin = require("firebase-admin");
const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIAL);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

app.post("/send-push-fcm", async (req, res) => {
  const { token, title, body, image } = req.body;

  const message = {
    notification: {
      title,
      body,
      image,
    },
    webpush: {
      notification: {
        icon: "https://test.akadigital.net/logo.png"
      }
    },
    token
  };

  try {
    const response = await admin.messaging().send(message);
    res.send({ success: true, response });
  } catch (err) {
    console.error("Error sending message:", err);
    res.status(500).send({ success: false, error: err });
  }
});

//APNS
/*
const forge = require('node-forge');
const archiver = require("archiver");

const WEBSITE_PUSH_ID = 'web.net.akadigital.test';
const DOMAIN = 'https://test.akadigital.net';

// 1. Serve push package
app.get('/v1/pushPackages/:websitePushID', async (req, res) => {
  const { websitePushID } = req.params;

  console.log('📥 Incoming request for Website Push ID:', websitePushID);

  if (websitePushID !== WEBSITE_PUSH_ID) {
    console.warn('❌ Invalid Website Push ID');
    return res.status(404).send('Invalid Website Push ID');
  }

  try {
    const packagePath = await createPushPackage(); // generates the .zip file
    res.setHeader('Content-Type', 'application/zip');
    res.sendFile(packagePath);
  } catch (err) {
    console.error('❌ Error creating push package:', err);
    res.status(500).send('Error generating push package');
  }
});


// 2. Device registration (mock only)
app.post('/v1/devices/:deviceToken/registrations/:websitePushID', (req, res) => {
  console.log('✅ Device registered:', req.params.deviceToken);
  res.sendStatus(200);
});

// 3. Device deregistration (optional)
app.delete('/v1/devices/:deviceToken/registrations/:websitePushID', (req, res) => {
  console.log('❌ Device deregistered:', req.params.deviceToken);
  res.sendStatus(200);
});

async function createPushPackage() {
  const tempDir = path.join(__dirname, 'pushPackage');
  const zipPath = path.join(__dirname, 'pushPackage.zip');

  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

  // 1. Write website.json
  const websiteJSON = {
    websiteName: 'Aka Digital',
    websitePushID: WEBSITE_PUSH_ID,
    allowedDomains: [DOMAIN],
    urlFormatString: `${DOMAIN}/?url=%@`,
    authenticationToken: '123456',
    webServiceURL: 'https://test.akadigital.net',
  };
  fs.writeFileSync(path.join(tempDir, 'website.json'), JSON.stringify(websiteJSON));

  // 2. Add icons (you must have 'icon.png' in your project)
  const iconset = path.join(tempDir, 'icon.iconset');
  fs.mkdirSync(iconset, { recursive: true });
  const placeholderIcon = fs.readFileSync(path.join(__dirname, 'icon.png'));
  [16, 32, 128, 256, 512].forEach(size => {
    fs.writeFileSync(path.join(iconset, `icon_${size}x${size}.png`), placeholderIcon);
  });

  // 3. Generate manifest.json
  const manifest = {};
  const files = [
    'website.json',
    'icon.iconset/icon_16x16.png',
    'icon.iconset/icon_32x32.png',
    'icon.iconset/icon_128x128.png',
    'icon.iconset/icon_256x256.png',
    'icon.iconset/icon_512x512.png',
  ];

  for (const file of files) {
    const filePath = path.join(tempDir, file);
    const hash = forge.md.sha1.create();
    hash.update(fs.readFileSync(filePath).toString('binary'));
    manifest[file] = hash.digest().toHex();
  }

  fs.writeFileSync(path.join(tempDir, 'manifest.json'), JSON.stringify(manifest));

  // 4. Sign manifest.json using your .p12 certificate
  const certPem = fs.readFileSync('./cert.pem', 'utf8');
  const keyPem = fs.readFileSync('./key.pem', 'utf8');
  
  const cert = forge.pki.certificateFromPem(certPem);
  const key = forge.pki.privateKeyFromPem(keyPem);
  
  const signature = forge.pkcs7.createSignedData();
  signature.content = forge.util.createBuffer(fs.readFileSync(path.join(tempDir, 'manifest.json')));
  signature.addCertificate(cert);
  signature.addSigner({
    key: key,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha1,
  });
  signature.sign();
  
  const sigDer = forge.asn1.toDer(signature.toAsn1()).getBytes();
  fs.writeFileSync(path.join(tempDir, 'signature'), Buffer.from(sigDer, 'binary'));

  // 5. Zip package
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip');
  archive.pipe(output);
  archive.directory(tempDir, false);
  await archive.finalize();

  return zipPath;
}
*/
const generatePushPackage = require('./generatePushPackage');

app.get('/v1/pushPackages/:websitePushID', async (req, res) => {
  const websitePushID = req.params.websitePushID;
  console.log('📥 Incoming request for Website Push ID:', websitePushID);

  try {
    const packagePath = await generatePushPackage(websitePushID);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=pushPackage.zip');
    res.sendFile(packagePath);
  } catch (error) {
    console.error('Failed to generate push package:', error);
    res.status(500).send('Push package generation failed.');
  }
});


app.post('/register', (req, res) => {
  const { deviceToken } = req.body;
  // Store deviceToken securely (e.g., in a DB)
  console.log('Received device token:', deviceToken);
  res.sendStatus(200);
});

// Endpoint to send a test push
app.post('/send', async (req, res) => {
  const { deviceToken, alert } = req.body;

  const options = {
    cert: path.join(__dirname, 'certs', 'cert.pem'),
    key: path.join(__dirname, 'certs', 'key.pem'),
    passphrase: '1234',
    production: false
  };
  
  const apnProvider = new apn.Provider(options);
  
  const sendSafariPush = async (deviceToken, alert) => {
    const note = new apn.Notification();
    note.alert = alert || 'Hello from Safari!';
    note.topic = 'web.net.akadigital.test'; // Your Website Push ID from Apple
    try {
      const result = await apnProvider.send(note, deviceToken);
      console.log(result);
    } catch (err) {
      console.error('Push failed:', err);
    } finally {
      apnProvider.shutdown();
    }
  };
});

app.post('/smartech_prompt', async (req, res) => {
  const myHeaders = new Headers();
  myHeaders.append("Authorization", "Bearer dfa7f5bf2b541feb134eb5a82b1c16f9");
  myHeaders.append("Content-Type", "application/json");
  
  const raw = JSON.stringify([
    {
      "asset_id": "5a201372c01685dfc1d995336f9d41f9",
      "activity_name": "prompt_clicked",
      "timestamp": new Date().toISOString().split('T')[0],
      "identity": "xuantrucx222@gmail.com",
      "activity_source": "app",
      "activity_params": {
        "name": "prompt",
        "deeplink": "aka://demo/prompt"
      }
    }
  ]);
  
  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow"
  };
  
  fetch("https://api2.netcoresmartech.com/v1/activity/upload", requestOptions)
    .then((response) => response.text())
    .then((result) => console.log(result))
    .catch((error) => console.error(error));
});

app.use(express.static('public'));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


app.listen(3000, () => {
  console.log("Server started on http://localhost:3000");
});


//openssl pkcs12 -in Certificates.p12 -out cert.pem -nocerts -provider-path "C:\Program Files\OpenSSL-Win64\bin" -legacy