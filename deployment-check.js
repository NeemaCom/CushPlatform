#!/usr/bin/env node

/**
 * Deployment Readiness Check for Cush Platform
 * Verifies all configurations before Vercel deployment
 */

import fs from 'fs';
import path from 'path';

const checks = [];
let passed = 0;
let failed = 0;

function check(name, condition, message) {
  const result = { name, passed: condition, message };
  checks.push(result);
  
  if (condition) {
    console.log(`✅ ${name}`);
    passed++;
  } else {
    console.log(`❌ ${name}: ${message}`);
    failed++;
  }
}

console.log('🚀 Cush Platform - Deployment Readiness Check\n');

// 1. Check project structure
check(
  'Root index.html exists',
  fs.existsSync('index.html'),
  'Missing root index.html file'
);

check(
  'Public directory exists',
  fs.existsSync('public') && fs.statSync('public').isDirectory(),
  'Missing public directory'
);

check(
  'API directory exists',
  fs.existsSync('api') && fs.statSync('api').isDirectory(),
  'Missing api directory'
);

check(
  'Vercel config exists',
  fs.existsSync('vercel.json'),
  'Missing vercel.json configuration'
);

// 2. Check PWA assets
const pwaAssets = [
  'public/manifest.json',
  'public/service-worker.js',
  'public/icons/icon-192x192.png',
  'public/icons/icon-512x512.png'
];

pwaAssets.forEach(asset => {
  check(
    `PWA asset: ${asset}`,
    fs.existsSync(asset),
    `Missing PWA asset: ${asset}`
  );
});

// 3. Check configuration files
check(
  'Environment example exists',
  fs.existsSync('.env.example'),
  'Missing .env.example file'
);

check(
  'Package.json exists',
  fs.existsSync('package.json'),
  'Missing package.json file'
);

check(
  'Vite config exists',
  fs.existsSync('vite.config.ts'),
  'Missing vite.config.ts file'
);

// 4. Check build configuration
try {
  const viteConfig = fs.readFileSync('vite.config.ts', 'utf8');
  check(
    'Vite build output configured',
    viteConfig.includes('dist/public'),
    'Vite build output not configured correctly'
  );
} catch (e) {
  check('Vite config readable', false, 'Cannot read vite.config.ts');
}

try {
  const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  check(
    'Vercel API routes configured',
    vercelConfig.routes && vercelConfig.routes.some(r => r.src.includes('/api/')),
    'Vercel API routes not configured'
  );
  
  check(
    'Vercel build configuration',
    vercelConfig.builds && vercelConfig.builds.length > 0,
    'Vercel build configuration missing'
  );
} catch (e) {
  check('Vercel config valid', false, 'Invalid vercel.json syntax');
}

// 5. Check client structure
check(
  'Client source exists',
  fs.existsSync('client/src') && fs.statSync('client/src').isDirectory(),
  'Missing client/src directory'
);

check(
  'Client index.html exists',
  fs.existsSync('client/index.html'),
  'Missing client/index.html file'
);

// 6. Check server structure
const serverFiles = [
  'server/index.ts',
  'server/routes.ts',
  'server/auth.ts',
  'server/db.ts'
];

serverFiles.forEach(file => {
  check(
    `Server file: ${file}`,
    fs.existsSync(file),
    `Missing server file: ${file}`
  );
});

// 7. Check database schema
check(
  'Database schema exists',
  fs.existsSync('shared/schema.ts'),
  'Missing database schema file'
);

check(
  'Drizzle config exists',
  fs.existsSync('drizzle.config.ts'),
  'Missing drizzle.config.ts file'
);

// 8. Check API structure
const apiFiles = [
  'api/index.ts',
  'api/[...path].ts'
];

apiFiles.forEach(file => {
  check(
    `API file: ${file}`,
    fs.existsSync(file),
    `Missing API file: ${file}`
  );
});

// Summary
console.log('\n📊 Deployment Readiness Summary');
console.log('================================');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

if (failed === 0) {
  console.log('\n🎉 Your Cush platform is ready for Vercel deployment!');
  console.log('\nNext steps:');
  console.log('1. Push code to GitHub repository');
  console.log('2. Connect repository to Vercel');
  console.log('3. Configure environment variables');
  console.log('4. Deploy and test');
} else {
  console.log('\n⚠️  Please fix the failed checks before deployment.');
  console.log('See VERCEL_DEPLOYMENT.md for detailed instructions.');
}

console.log('\n📚 Documentation: VERCEL_DEPLOYMENT.md');