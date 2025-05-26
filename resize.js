const sharp = require("sharp");

sharp("public/push/icon.iconset/16.png")
  .resize(32, 32)
  .toFile("icon_16x16@2x.png");

sharp("public/push/icon.iconset/32.png")
  .resize(64, 64)
  .toFile("icon_32x32@2x.png");

sharp("public/push/icon.iconset/128.png")
  .resize(256, 256)
  .toFile("icon_128x128@2x.png");