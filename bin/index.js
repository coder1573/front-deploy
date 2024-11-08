#!/usr/bin/env node

const fs = require('fs');
const inquirer = require('inquirer');
const packageJson = require('../package.json');
const deployFolder = 'deploy'
const deployConfigPath = `${process.cwd()}/${deployFolder}/deploy.config.js`;
const { checkNodeVersion, checkDeployConfig, errorLog, underlineLog, checkConfigScheme } = require('../utils/index');
const { generateConfigs } = require('../lib/init');

const version = packageJson.version;
const requiredNodeVersion = packageJson.engines.node;

// nodeJs 运行环境检查
checkNodeVersion(requiredNodeVersion, 'deploy-fe');

const program = require('commander');
const {loadConfig} = require("../utils");

// 定义版本
program.version(version);

// 定义 init 命令
program
    .command('init')
    .description('初始化部署相关配置')
    .action(() => {
        generateConfigs(deployFolder, deployConfigPath);
    });

// 解析参数并处理命令
program
    .arguments('<command>')  // 捕获未知命令
    .action((cmd) => {
        errorLog(`Unknown command ${cmd}\n`);
        if (!fs.existsSync(deployConfigPath)) {
            errorLog(`缺少部署相关的配置，请运行${underlineLog('fe-deploy init')}初始化配置\n`);
        }
        program.outputHelp();
        process.exit(1);
    });

const agrs = process.argv.slice(2);

const firstArg = agrs[0];

// 注册部署命令
if (fs.existsSync(deployConfigPath)) {
    // 加载配置
    const deployConfig = loadConfig(deployConfigPath);
    const configs = checkDeployConfig(deployConfig, false);
    addCommander(configs);
}

// 无参数时默认输出help信息
if (!firstArg) {
    program.outputHelp();
}

// 注册部署命令
function addCommander(deployConfigs) {
    if (!Array.isArray(deployConfigs)) {
        return;
    }

    deployConfigs.forEach(config => {
        const { command, projectName, name } = config;
        program
            .command(`${command}`)
            .description(`${underlineLog(projectName)}项目 ${underlineLog(name)}部署`)
            .action(() => {
                // 配置参数校验
                const flag = checkConfigScheme(command, config, config.privateKey);
                if (!flag) process.exit(1);

                inquirer.prompt([
                    {
                        type: 'confirm',
                        message: `${underlineLog(projectName)}项目是否部署到${underlineLog(name)}？`,
                        name: 'sure'
                    }
                ]).then(answers => {
                    const { sure } = answers;
                    if (!sure) {
                        process.exit(1);
                    } else {
                        const deploy = require('../lib/deploy');
                        deploy(config);
                    }
                });
            });
    });
}

// 解析参数
program.parse(process.argv);
