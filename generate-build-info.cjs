const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const filePath = path.join(__dirname, 'src', 'lib', 'build-info.json');

let commitHash = 'unknown';
try {
  commitHash = process.env.VERCEL_GIT_COMMIT_SHA || execSync('git rev-parse HEAD').toString().trim();
} catch (e) {
  console.log('Could not determine git commit hash');
}

const buildInfo = {
  commit: commitHash,
  buildTime: new Date().toISOString(),
  env: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
  schemaVersion: "20260701000004_fix_images_rls"
};

fs.writeFileSync(filePath, JSON.stringify(buildInfo, null, 2));
console.log('Build info generated successfully:', buildInfo.commit);
