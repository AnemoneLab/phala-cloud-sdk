# Phala Cloud SDK

用于与 Phala Cloud TEE 服务交互的JavaScript/TypeScript SDK。

## 安装

使用 npm:

```bash
npm install @anemonelab/phala-cloud-sdk
```

使用 yarn:

```bash
yarn add @anemonelab/phala-cloud-sdk
```

使用 pnpm:

```bash
pnpm add @anemonelab/phala-cloud-sdk
```

## 基本用法

```typescript
import { PhalaCloud } from '@anemonelab/phala-cloud-sdk';

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
import { PhalaCloud } from '@anemonelab/phala-cloud-sdk';
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
  env: ['KEY1=value1', 'KEY2=value2'],  // 可选的环境变量
  // 可选配置参数
  // vcpu: 1,               // 默认值: 1
  // memory: 2048,          // 默认值: 2048 MB
  // diskSize: 40,          // 默认值: 40 GB
  // image: 'dstack-dev-0.3.5', // 默认值: dstack-dev-0.3.5
  // teepodId: 3            // 默认值: 3，也可以自动寻找可用teepod
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
  name: 'my-application',  // 现有部署的名称，即应用ID
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
  env: ['KEY1=value1', 'KEY2=value2'],
  vcpu: 1,
  memory: 2048,
  diskSize: 40,
  image: 'dstack-dev-0.3.5',
  teepodId: 3
});

// 升级现有的TEE实例
const upgradeResponse = await phalaCloud.upgrade({
  name: 'my-app',
  compose: './docker-compose.yml',
  env: ['KEY1=value1', 'KEY2=value2']
});
```

### 监控部署状态

```typescript
// 监控部署状态
await phalaCloud.monitorDeploymentStatus('app-id-here', {
  interval: 5000,        // 检查间隔时间(毫秒)，默认5000
  maxRetries: 36,        // 最大尝试次数，默认36 (约3分钟)
  queryTimeout: 8000,    // 状态查询超时时间(毫秒)，默认8000
  onStatusChange: (status, cvm) => {
    console.log(`状态变化: ${status}`);
  },
  onSuccess: (cvm) => {
    console.log('部署成功!');
  },
  onFailure: (status, cvm) => {
    console.log(`部署失败: ${status}`);
  },
  onTimeout: (cvm) => {
    console.log('部署超时');
  },
  onError: (error) => {
    console.error('监控部署状态时发生错误:', error);
  }
});
```

## 调试

设置环境变量 `PHALA_SDK_DEBUG=true` 可以启用详细日志输出。

## 许可证

MIT 