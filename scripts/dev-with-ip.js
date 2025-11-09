#!/usr/bin/env node

const { spawn } = require('child_process');
const os = require('os');

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Ignorer les adresses internes (non IPv4) et les adresses de bouclage
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  
  return null;
}

const localIP = getLocalIP();
const port = process.env.PORT || 3000;

console.log('\n🚀 Démarrage du serveur de développement...\n');

if (localIP) {
  console.log(`  ✓ Local:        http://localhost:${port}`);
  console.log(`  ✓ Réseau:       http://${localIP}:${port}\n`);
} else {
  console.log(`  ✓ Local:        http://localhost:${port}\n`);
}

// Démarrer Next.js avec l'option -H 0.0.0.0
// Utiliser le chemin absolu vers le binaire next
const path = require('path');
const fs = require('fs');

// Essayer plusieurs chemins possibles pour le binaire next
const possiblePaths = [
  path.join(__dirname, '..', 'node_modules', '.bin', 'next'),
  path.join(__dirname, '..', 'node_modules', 'next', 'dist', 'bin', 'next'),
];

let nextBin = null;
for (const binPath of possiblePaths) {
  if (fs.existsSync(binPath)) {
    nextBin = binPath;
    break;
  }
}

// Si aucun chemin n'est trouvé, utiliser npx comme fallback
if (!nextBin) {
  console.log('⚠️  Binaire next non trouvé, utilisation de npx...\n');
  nextBin = 'npx';
  const nextProcess = spawn(nextBin, ['next', 'dev', '-H', '0.0.0.0'], {
    stdio: 'inherit',
    shell: true,
    env: process.env
  });
  
  nextProcess.on('error', (error) => {
    console.error('❌ Erreur lors du démarrage:', error);
    process.exit(1);
  });
  
  nextProcess.on('exit', (code) => {
    process.exit(code || 0);
  });
} else {
  const nextProcess = spawn('node', [nextBin, 'dev', '-H', '0.0.0.0'], {
    stdio: 'inherit',
    shell: false,
    env: process.env
  });
  
  nextProcess.on('error', (error) => {
    console.error('❌ Erreur lors du démarrage:', error);
    process.exit(1);
  });
  
  nextProcess.on('exit', (code) => {
    process.exit(code || 0);
  });
}

