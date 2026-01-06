#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Vérification de la configuration YapaGachis Backend...\n');

const checks = {
  passed: [],
  failed: [],
  warnings: [],
};

// Helper functions
function checkExists(filePath, description) {
  const fullPath = path.join(__dirname, '..', filePath);
  if (fs.existsSync(fullPath)) {
    checks.passed.push(`✅ ${description}`);
    return true;
  } else {
    checks.failed.push(`❌ ${description} - Fichier manquant: ${filePath}`);
    return false;
  }
}

function checkCommand(command, description) {
  try {
    execSync(command, { stdio: 'ignore' });
    checks.passed.push(`✅ ${description}`);
    return true;
  } catch (error) {
    checks.failed.push(`❌ ${description} - Commande non trouvée: ${command}`);
    return false;
  }
}

function checkEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    checks.passed.push('✅ Fichier .env existe');

    const content = fs.readFileSync(envPath, 'utf8');
    const requiredVars = [
      'DATABASE_URL',
      'REDIS_HOST',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
    ];

    requiredVars.forEach(varName => {
      if (content.includes(`${varName}=`) && !content.includes(`${varName}=your-`)) {
        checks.passed.push(`  ✅ ${varName} est configuré`);
      } else {
        checks.warnings.push(`  ⚠️  ${varName} doit être configuré`);
      }
    });
  } else {
    checks.failed.push('❌ Fichier .env manquant - Exécutez: cp .env.example .env');
  }
}

function checkNodeModules() {
  const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    checks.passed.push('✅ node_modules installés');
  } else {
    checks.failed.push('❌ node_modules manquants - Exécutez: npm install');
  }
}

function checkPrismaClient() {
  const prismaPath = path.join(
    __dirname,
    '..',
    'node_modules',
    '.prisma',
    'client'
  );
  if (fs.existsSync(prismaPath)) {
    checks.passed.push('✅ Client Prisma généré');
  } else {
    checks.warnings.push('⚠️  Client Prisma non généré - Exécutez: npm run prisma:generate');
  }
}

// Run all checks
console.log('📦 Vérification des fichiers de configuration...\n');
checkExists('package.json', 'package.json');
checkExists('tsconfig.json', 'tsconfig.json');
checkExists('.env.example', '.env.example');
checkExists('docker-compose.yml', 'docker-compose.yml');
checkExists('src/server.ts', 'Point d\'entrée du serveur');
checkExists('src/app.ts', 'Configuration Express');
checkExists('src/infrastructure/database/prisma/schema.prisma', 'Schéma Prisma');

console.log('\n🔧 Vérification des dépendances système...\n');
checkCommand('node --version', 'Node.js installé');
checkCommand('npm --version', 'npm installé');
checkCommand('docker --version', 'Docker installé');
checkCommand('docker-compose --version', 'Docker Compose installé');

console.log('\n📝 Vérification de l\'environnement...\n');
checkEnvFile();
checkNodeModules();
checkPrismaClient();

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 RÉSUMÉ DE LA VÉRIFICATION\n');

if (checks.passed.length > 0) {
  console.log('✅ SUCCÈS (' + checks.passed.length + '):\n');
  checks.passed.forEach(msg => console.log(msg));
}

if (checks.warnings.length > 0) {
  console.log('\n⚠️  AVERTISSEMENTS (' + checks.warnings.length + '):\n');
  checks.warnings.forEach(msg => console.log(msg));
}

if (checks.failed.length > 0) {
  console.log('\n❌ ÉCHECS (' + checks.failed.length + '):\n');
  checks.failed.forEach(msg => console.log(msg));
}

console.log('\n' + '='.repeat(60));

if (checks.failed.length === 0) {
  console.log('\n🎉 Votre configuration est prête !');
  console.log('\n📚 Prochaines étapes:');
  console.log('   1. Démarrez Docker: npm run docker:up');
  console.log('   2. Générez Prisma (si pas déjà fait): npm run prisma:generate');
  console.log('   3. Exécutez les migrations: npm run prisma:migrate');
  console.log('   4. Démarrez le serveur: npm run dev');
  console.log('\n   Visitez http://localhost:3000/health pour vérifier que l\'API fonctionne\n');
  process.exit(0);
} else {
  console.log('\n⚠️  Corrigez les problèmes ci-dessus avant de continuer.\n');
  process.exit(1);
}
