const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const archiver = require("archiver");
const forge = require("node-forge");

// Set proper paths
const pushPath = path.join(__dirname, "public", "push");
const certPath = path.join(__dirname, "certs", "cert.pem");
const keyPath = path.join(__dirname, "certs", "key.pem");
const outPath = path.join(__dirname, "pushPackage.zip");

// Step 1: Files relative to push folder
const files = [
  "website.json",
  "icon.iconset/icon_16x16.png",
  "icon.iconset/icon_16x16@2x.png",
  "icon.iconset/icon_32x32.png",
  "icon.iconset/icon_32x32@2x.png",
  "icon.iconset/icon_128x128.png",
  "icon.iconset/icon_128x128@2x.png",
];

// Step 2: Create manifest.json with SHA1 hashes
const manifest = {};
files.forEach(file => {
  const filePath = path.join(pushPath, file); // ✅ fixed
  const content = fs.readFileSync(filePath);
  const hash = crypto.createHash("sha1").update(content).digest("hex");
  manifest[file] = hash;
});
fs.writeFileSync(path.join(__dirname, "manifest.json"), JSON.stringify(manifest, null, 2));

// Step 3: Sign manifest.json
const manifestContent = fs.readFileSync(path.join(__dirname, "manifest.json"));

const p7 = forge.pkcs7.createSignedData();
p7.content = forge.util.createBuffer(manifestContent);
p7.addCertificate(fs.readFileSync(certPath).toString());
p7.addSigner({
  key: fs.readFileSync(keyPath).toString(),
  certificate: fs.readFileSync(certPath).toString(),
  digestAlgorithm: forge.pki.oids.sha1,
  authenticatedAttributes: [
    { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
    {
      type: forge.pki.oids.messageDigest,
      value: forge.md.sha1.create().update(manifestContent.toString()).digest().getBytes(),
    },
    { type: forge.pki.oids.signingTime, value: new Date() },
  ],
});

p7.sign();
const signature = forge.asn1.toDer(p7.toAsn1()).getBytes();
fs.writeFileSync(path.join(__dirname, "signature"), Buffer.from(signature, "binary"));

// Step 4: Create pushPackage.zip
const output = fs.createWriteStream(outPath);
const archive = archiver("zip");

output.on("close", () => {
  console.log("✅ pushPackage.zip created:", outPath);
});

archive.on("error", err => {
  throw err;
});

archive.pipe(output);

// Add files from public/push/
files.forEach(file => {
  archive.file(path.join(pushPath, file), { name: file }); // ✅ fixed
});

// Add manifest and signature from root
archive.file(path.join(__dirname, "manifest.json"), { name: "manifest.json" });
archive.file(path.join(__dirname, "signature"), { name: "signature" });

archive.finalize();
