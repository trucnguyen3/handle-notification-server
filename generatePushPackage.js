const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const archiver = require('archiver');
const forge = require('node-forge');

const pushPackagePath = path.join(__dirname, 'pushPackage');
const iconsetPath = path.join(pushPackagePath, 'icon.iconset');
const outputZipPath = path.join(__dirname, 'pushPackage.zip');

// Load and prepare the .p12 cert
const p12Buffer = fs.readFileSync(path.join(__dirname, 'certs/push_cert.p12'));
const p12Asn1 = forge.asn1.fromDer(p12Buffer.toString('binary'), false);
const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, '1234');

const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });

const cert = certBags[forge.pki.oids.certBag]?.[0]?.cert;
const privateKey = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]?.key;

if (!cert || !privateKey) {
  throw new Error('Failed to extract certificate or private key from P12 file.');
}

console.log('Certificate subject:', cert.subject.attributes.map(attr => `${attr.name}=${attr.value}`).join(', '));

function sha1Base64(filePath) {
  const content = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha1');
  hash.update(content);
  return hash.digest('base64');
}

function generateManifest() {
  const manifest = {};
  const files = fs.readdirSync(pushPackagePath);
  files.forEach(file => {
    const fullPath = path.join(pushPackagePath, file);
    if (fs.lstatSync(fullPath).isDirectory()) {
      // Handle icon.iconset
      const icons = fs.readdirSync(fullPath);
      icons.forEach(icon => {
        const iconPath = path.join(fullPath, icon);
        const relativePath = `icon.iconset/${icon}`;
        manifest[relativePath] = sha1Base64(iconPath);
      });
    } else {
      manifest[file] = sha1Base64(fullPath);
    }
  });

  fs.writeFileSync(path.join(__dirname, 'manifest.json'), JSON.stringify(manifest));
  return manifest;
}

function generateSignature(manifest) {
  const manifestBuffer = Buffer.from(JSON.stringify(manifest));
  const md = forge.md.sha1.create();
  md.update(manifestBuffer.toString('binary'));

  const signature = forge.pkcs7.createSignedData();
  signature.content = forge.util.createBuffer(manifestBuffer.toString('binary'));
  signature.addCertificate(cert);
  signature.addSigner({
    key: privateKey,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha1,
    authenticatedAttributes: [
      {
        type: forge.pki.oids.contentType,
        value: forge.pki.oids.data
      },
      {
        type: forge.pki.oids.messageDigest
      },
      {
        type: forge.pki.oids.signingTime,
        value: new Date()
      }
    ]
  });
  signature.sign();

  const asn1 = signature.toAsn1();
  const derBuffer = Buffer.from(forge.asn1.toDer(asn1).getBytes(), 'binary');
  fs.writeFileSync(path.join(__dirname, 'signature'), derBuffer);
}

function zipPushPackage() {
  const output = fs.createWriteStream(outputZipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  output.on('close', () => console.log('Push package zipped:', outputZipPath));
  archive.pipe(output);

  const filesToInclude = [
    'website.json',
    'manifest.json',
    'signature'
  ];

  filesToInclude.forEach(file => {
    archive.file(path.join(__dirname, file), { name: file });
  });

  // Add icons
  const iconFiles = fs.readdirSync(iconsetPath);
  iconFiles.forEach(file => {
    const filePath = path.join(iconsetPath, file);
    archive.file(filePath, { name: `icon.iconset/${file}` });
  });

  archive.finalize();
}

// --- Build the Push Package ---
const manifest = generateManifest();
generateSignature(manifest);
zipPushPackage();
