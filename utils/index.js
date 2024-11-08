#!/usr/bin/env node

const fs = require('fs');
const chalk = require('chalk');
const semver = require('semver');
const path = require("path");

const DEPLOY_SCHEMA = {
  name: '',
  script: "",
  host: '',
  port: 22,
  username: '',
  password: '',
  projectDir: '',
  distPath: '',
  webDir: '',
  backupDir: ''
};

const PRIVATE_KEY_DEPLOY_SCHEMA = {
  name: '',
  script: "",
  host: '',
  port: 22,
  projectDir: '',
  distPath: '',
  webDir: '',
  backupDir: ''
};

// 开始部署日志
function startLog(...content) {
  console.log(chalk.magenta(...content));
}

// 信息日志
function infoLog(...content) {
  console.log(chalk.blue(...content));
}

// 成功日志
function successLog(...content) {
  console.log(chalk.green(...content));
}

// 警告日志
function warningLog(...content) {
  console.log(chalk.yellow(...content));
}

// 错误日志
function errorLog(...content) {
  console.log(chalk.red(...content));
}

// 下划线重点输出
function underlineLog(content) {
  return chalk.blue.underline.bold(`${content}`);
}

// 检查node版本是否符合特定范围
function checkNodeVersion(wanted, id) {
  if (!semver.satisfies(process.version, wanted)) {
    errorLog(`You ar using Node ${process.version}, but this version of ${id} requres Node ${wanted} .\nPlease upgrage your Node version.`);
    process.exit(1);
  }
}

// 检查配置是否符合特定schema
function checkConfigScheme(configKey, configObj, privateKey) {
  let deploySchemaKeys;
  const configKeys = Object.keys(configObj);
  const neededKeys = [];
  const unConfigedKeys = [];
  let configValid = true;
  if (privateKey) {
    deploySchemaKeys = Object.keys(PRIVATE_KEY_DEPLOY_SCHEMA);
  } else {
    deploySchemaKeys = Object.keys(DEPLOY_SCHEMA);
  }
  for (let key of deploySchemaKeys) {
    if (!configKeys.includes(key)) {
      neededKeys.push(key);
    }
    if (configObj[key] === '') {
      unConfigedKeys.push(key);
    }
  }
  if (neededKeys.length > 0) {
    errorLog(`${configKey}缺少${neededKeys.join(',')}配置，请检查配置`);
    configValid = false;
  }
  if (unConfigedKeys.length > 0) {
    errorLog(`${configKey}中的${unConfigedKeys.join(', ')}暂未配置，请设置该配置项`);
    configValid = false;
  }
  return configValid;
}

// 检查deploy配置是否合理
function checkDeployConfig(config, checkConfig=true) {
  const { privateKey, passphrase, projectName } = config;
  const keys = Object.keys(config);
  const configs = [];
  for (let key of keys) {
    if (config[key] instanceof Object) {
      if (checkConfig && !checkConfigScheme(key, config[key], privateKey)) {
        return false;
      }
      config[key].command = key;
      config[key].privateKey = privateKey;
      config[key].passphrase = passphrase;
      config[key].projectName = projectName;
      configs.push(config[key]);
    }
  }
  return configs;
}

// 加载配置文件
function loadConfig(configPath) {
  // 加载主配置文件
  const configs = require(path.join(configPath));

  const subConfigPath = path.join(path.dirname(configPath), 'conf');
  // 动态加载 conf 目录下的子配置文件
  fs.readdirSync(subConfigPath).forEach(file => {
    if (file.endsWith('.js')) {
      try {
        const fileConfigs = require(path.join(subConfigPath, file));
        // 合并每个文件中的配置
        Object.assign(configs, fileConfigs);
      } catch (error) {
        console.error(`加载子配置文件出错 ${file}:`, error);
      }
    }
  });

  return configs;
}

module.exports = {
  startLog,
  infoLog,
  successLog,
  warningLog,
  errorLog,
  underlineLog,
  checkNodeVersion,
  checkConfigScheme,
  checkDeployConfig,
  loadConfig
};
