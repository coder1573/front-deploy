#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const inquirer = require('inquirer');
const childProcess = require('child_process');
const ora = require('ora');
const node_ssh = require('node-ssh');
const archiver = require('archiver');
const { successLog, warningLog, errorLog, underlineLog } = require('../utils/index');

let ssh = new node_ssh(); // 生成ssh实例

let isIncremental = true; // 是否增量部署，false 为全量部署

// 部署流程入口
async function deploy(config) {
  const { script, webDir, backupDir, distPath, projectName, name, projectDir } = config;
  try {
    // 前置环节，zip存在则删除
    await deleteLocalZip(projectDir);

    // 开始部署
    await confirmDeployType();
    await confirmSkipBuild(script, projectDir);
    await startZip(distPath, projectDir);
    await connectSSH(config);
    await backupWebFile(webDir, backupDir);
    await uploadFile(webDir, projectDir);
    await unzipFile(webDir);
    await deleteLocalZip(projectDir);
    successLog(`\n 恭喜您，${underlineLog(projectName)}项目 ${underlineLog(name)} ${underlineLog(isIncremental ? '增量' : '全量')}部署成功了^_^\n`);
    process.exit(0);
  } catch (err) {
    errorLog(`  部署失败 ${err}`);
    process.exit(1);
  }
}

// 增量、全量部署确认
async function confirmDeployType() {
  try {
    // 等待用户输入，阻塞到用户选择后继续执行
    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        message: '是否增量部署？',
        name: 'sure',
        default: true
      }
    ]);

    const { sure } = answers;
    isIncremental = sure;
  } catch (error) {
    console.error('操作时出错：', error);
  }
}

// 打包确认
async function confirmSkipBuild(script, projectDir) {
  try {
    // 等待输入，阻塞到选择后继续执行
    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        message: '是否跳过项目打包环节？',
        name: 'sure',
        default: true
      }
    ]);

    const { sure } = answers;

    if (!sure) {
      // 选择不跳过，继续执行打包
      await execBuild(script, projectDir);
    } else {
      console.log(`\n（1）项目打包`);
      successLog('  跳过打包环节');
    }
  } catch (error) {
    console.error('操作时出错：', error);
  }
}

// 异步执行打包脚本
function execBuildPromise(command, options) {
  return new Promise((resolve, reject) => {
    const spinner = ora('正在打包项目...');
    spinner.start();
    const child = childProcess.exec(command, options, (error, stdout, stderr) => {
      spinner.stop();
      if (error) {
        reject(error);
        return;
      }
      if (stderr) { // 并不代表发生错误
        warningLog('\nWARNING', stderr);
        resolve(stdout);
      }
      console.log(stdout);
      resolve(stdout);
    });

    child.stdout.on('data', () => {
      spinner.render();
    });

    child.stderr.on('data', () => {
      spinner.render();
    });
  });
}

// 第一步，执行打包脚本
async function execBuild(script, projectDir) {
  try {
    console.log(`\n（1）${script}`);
    await execBuildPromise(script, { cwd: projectDir });
    successLog('  项目打包成功');
  } catch (err) {
    errorLog('\n   项目打包失败', err);
    process.exit(1);
  }
}

// 异步打包zip
function startZipPromise(distPath, projectDir) {
  return new Promise((resolve, reject) => {
    distPath = path.resolve(projectDir, distPath);
    const archive = archiver('zip', {
      zlib: { level: 9 },
    }).on('error', err => {
      throw err;
    });
    const output = fs.createWriteStream(path.join(projectDir, 'dist.zip'));
    output.on('close', err => {
      if (err) {
        reject(err);
        process.exit(1);
      }
      resolve();
    });
    // 将归档数据传输到输出流
    archive.pipe(output);
    if (isIncremental) { // 增量部署，部分打包
      // 添加文件
      archive.file(path.join(distPath, 'index.html'), { name: 'index.html' });
      archive.file(path.join(distPath, 'index.html.gz'), { name: 'index.html.gz' });
      // 添加目录
      archive.directory(path.join(distPath, 'static'), 'static');
    } else { // 全量部署，全部打包
      // 添加目录
      archive.directory(`${distPath}`, '/');
    }

    // 完成归档
    archive.finalize();
  });
}

// 第二步，打包zip
async function startZip(distPath, projectDir) {
  try {
    console.log('（2）打包成zip');
    await startZipPromise(distPath, projectDir);
    successLog('  zip打包成功');
  } catch {
    errorLog('   zip打包失败', err);
    process.exit(1);
  }
}

// 第三步，连接SSH
async function connectSSH(config) {
  const { host, port, username, password, privateKey, passphrase } = config;
  const sshConfig = {
    host,
    port,
    username,
    password,
    privateKey,
    passphrase
  };
  try {
    console.log(`（3）连接${underlineLog(host)}`);
    await ssh.connect(sshConfig);
    successLog('  SSH连接成功');
  } catch (err) {
    errorLog(`  SSH连接失败 ${err}`);
    process.exit(1);
  }
}

// 第四步，上传zip包
async function uploadFile(webDir, projectDir) {
  try {
    console.log(`（4）上传zip至目录${underlineLog(webDir)}`);
    await ssh.putFile(path.join(projectDir, 'dist.zip'), path.join(webDir, 'dist.zip'));
    successLog('  zip包上传成功');
  } catch (err) {
    errorLog(`  zip包上传失败 ${err}`);
    process.exit(1);
  }
}

// 获取当前日期
function getCurrentDateTimeString() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

// 服务端项目删除
async function deleteWebFile(webDir) {
  try {
    // 删除网站
    if (isIncremental) {
      // 增量部署，删除部分
      await runSSHCommand(`rm -rf ${path.join(webDir, 'index.html')}`, { cwd: webDir });
      await runSSHCommand(`rm -rf ${path.join(webDir, 'index.html.gz')}`, { cwd: webDir });
      await runSSHCommand(`rm -rf ${path.join(webDir, 'static')}`, { cwd: webDir });
      successLog('  2）网站删除成功（部分）');
    } else {
      // 全量部署，删除全部
      await runSSHCommand(`find ${webDir} -mindepth 1 -delete`, { cwd: webDir });
      successLog('  2）网站删除成功（全部）');
    }
  } catch (err) {
    errorLog(`  2）网站删除失败 ${err}`);
    process.exit(1);
  }
}

// 第五步，服务端项目备份
async function backupWebFile(webDir, backupDir) {
  try {
    // 获取当前日期
    const timeStr = getCurrentDateTimeString();
    // 获取网站文件夹名称
    const webFolder = path.basename(webDir);
    const parentWebDir = path.dirname(webDir);
    // 构建压缩文件路径
    const tarFullPath = path.join(backupDir, `${webFolder || '未命名'}_${timeStr}.tar.gz`);
    console.log(`（5）服务器网站备份至目录${underlineLog(tarFullPath)}并删除`);
    // await runSSHCommand(`cd ${webDir}`, { cwd: webDir }); // 进入目录后再打包，防止打包带入完整的上级目录
    await runSSHCommand(`tar -czvf ${tarFullPath} ${webFolder}`, { cwd: parentWebDir });
    successLog('  1)网站备份成功');
    // 删除网站
    await deleteWebFile(webDir);
  } catch (err) {
    errorLog(`  1）网站备份 ${err}`);
    process.exit(1);
  }
}

// 通过ssh运行命令
async function runSSHCommand(command, options) {
  try {
    const { stdout, stderr, code } = await ssh.execCommand(command, options);

    if (code === 0) {
      if (stdout) {
        console.log(stdout);
      }
    } else {
      errorLog('   命令执行失败，退出码:', code);
      errorLog('   错误信息:', stderr);
      process.exit(1)
    }
  } catch (error) {
    errorLog('   执行命令时出现异常:', error);
    throw new Error('');
  }
}

// 第六步，解压zip包
async function unzipFile(webDir) {
  try {
    console.log(`（6）开始解压zip包至${underlineLog(webDir)}`);
    // await runSSHCommand(`cd ${webDir}`, { cwd: webDir });
    await runSSHCommand(`unzip -o dist.zip -d ${webDir} && rm -f dist.zip`, { cwd: webDir });
    successLog('  zip包解压成功');
  } catch (err) {
    errorLog(`  zip包解压失败 ${err}`);
    process.exit(1);
  }
}

// 第七步，删除本地dist.zip包
async function deleteLocalZip(projectDir) {
  return new Promise((resolve, reject) => {
    const zipFile = path.join(projectDir, 'dist.zip')
    if (fs.existsSync(zipFile)) {
      console.log('（7）开始删除本地zip包');
      fs.unlink(zipFile, err => {
        if (err) {
          errorLog(`  本地zip包删除失败 ${err}`, err);
          reject(err);
          process.exit(1);
        }
        successLog('  本地zip包删除成功\n');
        resolve();
      });
    } else {
      resolve();
    }
  });
}


module.exports = deploy;
