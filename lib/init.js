#!/usr/bin/env node

const fs = require('fs');
const { infoLog, successLog, errorLog } = require('../utils/index');
const path = require("node:path");


// 要写入的内容
const configContent = `// 主配置对象
const config = {
  privateKey: '', // 本地私钥地址，位置一般在C:/Users/xxx/.ssh/id_rsa，非必填，有私钥则配置
  passphrase: '', // 本地私钥密码，非必填，有私钥则配置
  projectName: '测试项目', // 项目名称

  // 根据需要进行配置，支持多环境部署
  // 支持子配置文件动态导入
  'dev': {
    name: '测试环境',
    script: "npm run build:prod", // 打包脚本
    host: '', // 服务器地址
    port: 22, // ssh port，一般默认22
    username: '', // 登录服务器用户名
    password: '', // 登录服务器密码
    projectDir: '/projects/deploy', // 本地项目目录
    distPath: 'dist',  // 本地打包dist文件夹
    webDir: '/home/wwwroot/test/web',  // 服务器上传目录,即网站发布目录
    backupDir: '/home/wwwroot/test/bak',  // 服务器网站备份目录
  },
  'prod': {
    name: '生产环境',
    script: "npm run build:prod", // 打包脚本
    host: '', // 服务器地址
    port: 22, // ssh port，一般默认22
    username: '', // 登录服务器用户名
    password: '', // 登录服务器密码
    projectDir: '/projects/deploy', // 本地项目目录
    distPath: 'dist',  // 本地打包dist文件夹
    webDir: '/home/wwwroot/deploy/web',  // 服务器上传目录,即网站发布目录
    backupDir: '/home/wwwroot/deploy/bak',  // 服务器网站备份目录
  },
}

module.exports = config;`;

// 检查部署目录及部署配置文件是否存在
const checkDeployExists = (deployFolder, deployConfigPath) => {
  if (!fs.existsSync(deployFolder)) {
    try {
      fs.mkdirSync(deployFolder);
      fs.mkdirSync(path.join(deployFolder, 'conf'));
    } catch (err) {
      errorLog('文件夹创建失败：', err);
      process.exit(1);
    }
  }
  if (fs.existsSync(deployConfigPath)) {
      infoLog(`${deployConfigPath}配置文件已经存在，请勿重新初始化`);
      process.exit(1);
  }
};

// 初始化配置文件
function generateConfigs(deployFolder, deployConfigPath) {
  checkDeployExists(deployFolder, deployConfigPath);
  // 写入 deploy.config.js 文件
  fs.writeFile(deployConfigPath, configContent, (err) => {
    if (err) {
      console.error('初始化配置文件时出错:', err);
      process.exit(1);
    } else {
      successLog(`${deployConfigPath} 文件已完成初始化，请前往配置`);
      console.log('注意：请删除不必要的环境配置（如只需线上环境，请删除dev测试环境配置）');
      process.exit(0);
    }
  });
}

module.exports = {
    generateConfigs
}
