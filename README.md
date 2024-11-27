# front-deploy
前端轻量化部署脚手架，支持测试、线上等多环境部署，支持环境配置扩展，配置好后仅需一条命令即可完成整个部署流程。

## git地址：
https://github.com/coder1573/front-deploy

## npm地址：
https://www.npmjs.com/package/front-deploy

## 适用对象
目前还在采用手工部署又期望快速实现轻量化部署的小团队或者个人项目。

## 博客
`编写中`

## 前提条件
能通过ssh连上服务器即可

## 安装
全局安装front-deploy
```
npm i front-deploy -g
```
查看版本，表示安装成功。
```
fe-deploy -V
```

## 使用
### 1.初始化部署模板
```
# 创建部署目录，配置模版会存放在此处
mkdir front-deploy
# 进入部署目录
cd front-deploy
# 初始化部署模板
fe-deploy init
```

### 2.配置部署环境
部署配置文件位于deploy文件夹下的`deploy.config.js`,
一般包含`dev`（测试环境）配置，再有多余的环境配置形式与之类似，也可以选择将`dev`或其他配置放置到`conf`子目录下。

主配置文件`deploy.config.js`：
```
module.exports = {
  privateKey: '', // 本地私钥地址，位置一般在C:/Users/xxx/.ssh/id_rsa，非必填，有私钥则配置
  passphrase: '', // 本地私钥密码，非必填，有私钥则配置
  projectName: 'hivue', // 项目名称
  dev: { // 测试环境
    name: '测试环境',
    script: "npm run build:prod", // 打包脚本
    host: '', // 服务器IP地址
    port: 22, // ssh port，一般默认22
    username: '', // 登录服务器用户名
    password: '', // 登录服务器密码
    projectDir: '/projects/deploy', // 本地项目路径
    distPath: 'dist',  // 本地打包dist文件夹
    webDir: '/home/wwwroot/deploy/web',  // 网站发布目录部署路径，也即服务器上传路径
    backupDir: '/home/wwwroot/deploy/bak',  // 服务器网站备份路径
  },
  prod: {  // 线上环境
    name: '线上环境',
    script: "npm run build:prod", // 线上环境打包脚本
    host: '', // 服务器IP地址
    port: 22, // ssh port，一般默认22
    username: '', // 登录服务器用户名
    password: '', // 登录服务器密码
    projectDir: '/projects/deploy', // 本地项目路径
    distPath: 'dist',  // 本地打包dist文件夹
    webDir: '/home/wwwroot/deploy/web',  // 网站发布目录部署路径，也即服务器上传路径
    backupDir: '/home/wwwroot/deploy/bak',  // 服务器网站备份路径
  }
  // 再还有多余的环境按照这个格式写即可
}
```

子配置文件`conf/beijing.conf.js`：
```
module.exports = {
  dev: { // 测试环境
    name: '测试环境',
    script: "npm run build:prod", // 打包脚本
    host: '', // 服务器IP地址
    port: 22, // ssh port，一般默认22
    username: '', // 登录服务器用户名
    password: '', // 登录服务器密码
    projectDir: '/projects/deploy', // 本地项目路径
    distPath: 'dist',  // 本地打包dist文件夹
    webDir: '/home/wwwroot/deploy/web',  // 网站发布目录部署路径，也即服务器上传路径
    backupDir: '/home/wwwroot/deploy/bak',  // 服务器网站备份路径
  }
  // 再还有多余的环境按照这个格式写即可
}
```


### 3.查看部署命令
配置好`deploy.config.js`，运行
```
fe-deploy --help
```
查看部署命令

### 4.环境部署
测试环境部署采用的是`dev`的配置
```
fe-deploy dev
```
先按提示完成操作，确认后进入部署流程，执行完成后，部署成功！！！

⚠️注意：提示2中的是否增量部署的含义
- 默认Y增量，只更新index.html、index.html.gz和static到服务器
- N为全量dist目录下的所有文件都会上传到服务器

### 5.其他部署
部署流程参见4
```
fe-deploy [other env name]
```

# 感谢
- [fe-deploy-cli](https://github.com/dadaiwei/fe-deploy-cli)

本项目完全参考该开源项目

重新发布的原因
1. 学习并练习动手能力（🐶主要原因）
2. 原作者已经很久没有更新了，不是很满足当前业务需求
3. 更改了部分逻辑更贴合作者当前的业务

当前业务需求是一个项目经常会部署到多个服务器上，每次更新都要进行手动上传至全部的服务器、备份等重复性操作，由于管理服务器较多很容易更新出错，且效率低下。偶然发现该项目，遂结合自己的业务进行了二次开发。

add features：
- 增加网站备份
- 重构配置文件生成方式、加载方式，支持子配置文件
- 增加可选是否重新打包项目
- 增加可选增量/全量更新
- 部分其他优化


感谢大家支持，欢迎star，O(∩_∩)O。
