#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

console.log('🔍 开始环境检查...\n');

// 检查Node.js版本
const nodeVersion = process.versions.node;
const [major, minor] = nodeVersion.split('.').map(Number);
console.log(`Node.js 版本: ${nodeVersion}`);
if (major < 18) {
  console.error('❌ Node.js 版本需要 >= 18.0.0');
  process.exit(1);
} else {
  console.log('✅ Node.js 版本符合要求');
}

// 检查pnpm是否安装
try {
  const pnpmVersion = process.env.npm_config_user_agent?.match(/pnpm\/(\d+\.\d+\.\d+)/)?.[1];
  if (pnpmVersion) {
    console.log(`pnpm 版本: ${pnpmVersion}`);
    const [pnpmMajor] = pnpmVersion.split('.').map(Number);
    if (pnpmMajor >= 8) {
      console.log('✅ pnpm 版本符合要求');
    } else {
      console.error('❌ pnpm 版本需要 >= 8.0.0');
      process.exit(1);
    }
  } else {
    console.warn('⚠️  未检测到pnpm，建议使用pnpm作为包管理器');
  }
} catch (e) {
  console.warn('⚠️  检测pnpm版本失败');
}

// 检查目录结构
const requiredDirs = [
  'apps/frontend',
  'apps/backend',
  'packages/common',
  'docs',
];

console.log('\n📁 检查目录结构...');
requiredDirs.forEach(dir => {
  if (fs.existsSync(path.resolve(dir))) {
    console.log(`✅ ${dir} 存在`);
  } else {
    console.error(`❌ ${dir} 不存在`);
    process.exit(1);
  }
});

// 检查package.json
console.log('\n📦 检查package.json...');
const rootPkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
if (rootPkg.name === 'vidforge' && rootPkg.workspace) {
  console.log('✅ 根package.json配置正确');
} else {
  console.error('❌ 根package.json配置错误');
  process.exit(1);
}

// 检查前端配置
console.log('\n🌐 检查前端配置...');
const frontendPkg = JSON.parse(fs.readFileSync('apps/frontend/package.json', 'utf-8'));
if (frontendPkg.name === '@vidforge/frontend' && frontendPkg.dependencies.react) {
  console.log('✅ 前端package.json配置正确');
} else {
  console.error('❌ 前端package.json配置错误');
  process.exit(1);
}

// 检查后端配置
console.log('\n🖥️  检查后端配置...');
const backendPkg = JSON.parse(fs.readFileSync('apps/backend/package.json', 'utf-8'));
if (backendPkg.name === '@vidforge/backend' && backendPkg.dependencies['@nestjs/common']) {
  console.log('✅ 后端package.json配置正确');
} else {
  console.error('❌ 后端package.json配置错误');
  process.exit(1);
}

// 检查环境变量文件
console.log('\n⚙️  检查环境变量配置...');
const envPath = 'apps/backend/.env';
if (fs.existsSync(envPath)) {
  console.log('✅ .env 文件存在');
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const requiredEnvs = [
    'DATABASE_URL',
    'REDIS_URL',
    'JWT_SECRET',
    'VOLC_ENGINE_ACCESS_KEY',
    'VOLC_ENGINE_SECRET_KEY',
    'OSS_ACCESS_KEY',
    'OSS_SECRET_KEY',
  ];
  
  requiredEnvs.forEach(envKey => {
    if (envContent.includes(envKey)) {
      console.log(`✅ ${envKey} 配置存在`);
    } else {
      console.warn(`⚠️  ${envKey} 未配置，开发环境可暂用Mock`);
    }
  });
} else {
  console.warn('⚠️  .env 文件不存在，可参考apps/backend/.env模板创建');
}

console.log('\n🎉 环境检查完成！');
console.log('📝 快速启动命令：');
console.log('  1. pnpm install');
console.log('  2. 配置apps/backend/.env');
console.log('  3. pnpm dev (同时启动前后端)');
console.log('  4. 访问 http://localhost:3000');
