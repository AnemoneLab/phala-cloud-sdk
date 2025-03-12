# Phala Cloud SDK

用于与 Phala Cloud TEE 服务交互的JavaScript/TypeScript SDK。

## 安装

使用 npm:

```bash
npm install phala-cloud-sdk
```

使用 yarn:

```bash
yarn add phala-cloud-sdk
```

使用 pnpm:

```bash
pnpm add phala-cloud-sdk
```

## 基本用法

```typescript
import { PhalaCloud } from 'phala-cloud-sdk';

// 创建SDK实例
const phalaCloud = new PhalaCloud({
  apiKey: 'YOUR_API_KEY_HERE',
  // apiUrl: 'OPTIONAL_CUSTOM_API_URL'
});

// 获取用户信息
const userInfo = await phalaCloud.getUserInfo();
console.log('User info:', userInfo);

// 列出所有CVM实例
const cvms = await phalaCloud.listCvms();
console.log(`Found ${cvms.length} CVM instances`);
```

## 功能示例

### 部署Docker容器

以下示例展示如何将Docker Hub上的镜像部署到Phala Cloud TEE环境：

```typescript
import { PhalaCloud } from 'phala-cloud-sdk';
import path from 'path';

// 创建SDK实例
const phalaCloud = new PhalaCloud({
  apiKey: 'YOUR_API_KEY_HERE',
});

// 部署容器
const deployResult = await phalaCloud.deploy({
  type: 'phala',
  mode: 'docker-compose',
  name: 'my-application',
  compose: './docker-compose.yml',  // 指向您的docker-compose.yml文件
  env: ['KEY1=value1', 'KEY2=value2']  // 可选的环境变量
});

console.log('部署成功!');
console.log('应用ID:', deployResult.app_id);
console.log('应用URL:', deployResult.app_url);
```

### 使用环境变量文件

您也可以使用环境变量文件(.env)：

```typescript
// 使用环境变量文件部署
const deployResult = await phalaCloud.deploy({
  type: 'phala',
  mode: 'docker-compose',
  name: 'my-application',
  compose: './docker-compose.yml',
  envFile: './.env'  // 指向您的.env文件
});
```

### 升级现有部署

```typescript
// 升级现有部署
const upgradeResult = await phalaCloud.upgrade({
  name: 'my-application',  // 现有部署的名称
  compose: './docker-compose.yml',  // 新的配置文件
  env: ['KEY1=new-value', 'DEBUG=true']  // 更新的环境变量
});

console.log('升级成功!');
console.log('详情:', upgradeResult.detail);
```

## 完整示例

项目的`examples`目录中包含了以下完整示例：

1. `deploy-container.ts` - 基本的容器部署示例
2. `deploy-with-env-file.ts` - 使用环境变量文件部署的示例
3. `upgrade-container.ts` - 升级现有部署的示例

要运行这些示例，首先安装必要的依赖：

```bash
npm install -g ts-node
npm install
```

然后运行示例：

```bash
# 确保替换示例中的API_KEY
ts-node examples/deploy-container.ts
```

## API参考

### 初始化

```typescript
// 使用API密钥进行认证
const phalaCloud = new PhalaCloud({
  apiKey: 'YOUR_API_KEY_HERE'
});
```

### 用户与CVM操作

```typescript
// 获取当前用户信息
const userInfo = await phalaCloud.getUserInfo();

// 列出所有CVM实例
const cvms = await phalaCloud.listCvms();

// 通过应用ID获取CVM信息
const cvm = await phalaCloud.getCvmByAppId('app-id-here');

// 获取CVM的公钥
const pubkey = await phalaCloud.getPubkeyFromCvm('app-id-here');
```

### 部署与升级

```typescript
// 部署一个新的TEE实例
const deployResponse = await phalaCloud.deploy({
  type: 'phala',
  mode: 'docker-compose',
  name: 'my-app',
  compose: './docker-compose.yml',
  env: ['KEY1=value1', 'KEY2=value2']
});

// 升级现有的TEE实例
const upgradeResponse = await phalaCloud.upgrade({
  name: 'my-app',
  compose: './docker-compose.yml',
  env: ['KEY1=value1', 'KEY2=value2']
});
```

## 调试

设置环境变量 `PHALA_SDK_DEBUG=true` 可以启用详细日志输出。

## 许可证

MIT 