import { PhalaCloud } from '../src';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config'; // 自动加载.env文件

/**
 * 此示例演示如何使用Phala Cloud SDK升级现有Docker容器
 * 
 * 要运行此示例，您需要:
 * 1. 设置环境变量PHALA_API_KEY或在.env文件中配置
 * 2. 确保docker-compose.yml文件在同一目录中
 * 3. 已经有一个名为APP_ID的运行中容器
 * 
 * 环境变量设置方式:
 * - 直接设置: `export PHALA_API_KEY=your_api_key_here`
 * - 或在.env文件中设置: `PHALA_API_KEY=your_api_key_here`
 * 
 * 运行命令: 
 * ts-node upgrade-container.ts <app_id>
 */

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 启用调试模式
process.env.PHALA_SDK_DEBUG = 'true';

// 配置
const API_KEY = process.env.PHALA_API_KEY;
const COMPOSE_FILE_PATH = path.join(__dirname, 'docker-compose.yml');

// 额外的环境变量(可选)
const ENV_VARS = [
  'API_SECRET=updated-secret-here',
  'DEBUG=true'
];

async function main() {
  try {
    // 验证参数
    if (process.argv.length < 3) {
      console.error('缺少必要参数: app_id');
      console.error('用法: ts-node upgrade-container.ts <app_id>');
      process.exit(1);
    }
    
    const APP_ID = process.argv[2];
    
    // 验证API密钥是否存在
    if (!API_KEY) {
      console.error('错误: 缺少API密钥。请设置PHALA_API_KEY环境变量或在.env文件中配置。');
      console.error('可以通过以下方式设置:');
      console.error('- 直接设置环境变量: export PHALA_API_KEY=your_api_key_here');
      console.error('- 或在.env文件中添加: PHALA_API_KEY=your_api_key_here');
      process.exit(1);
    }
    
    console.log('API密钥: ****' + API_KEY.substring(API_KEY.length - 4));
    console.log('使用compose文件:', COMPOSE_FILE_PATH);
    console.log('应用ID:', APP_ID);
    
    // 初始化SDK
    console.log('\n初始化Phala Cloud SDK...');
    const phalaCloud = new PhalaCloud({
      apiKey: API_KEY,
    });
    
    // 获取CVM信息以确认其存在
    console.log(`\n获取应用 ${APP_ID} 的信息...`);
    try {
      const cvm = await phalaCloud.getCvmByAppId(APP_ID);
      console.log(`找到应用! 名称: ${cvm.name}, 状态: ${cvm.status}`);
    } catch (error) {
      console.error(`无法找到应用 ${APP_ID}:`, error.message);
      process.exit(1);
    }
    
    // 执行升级
    console.log(`\n准备升级应用 ${APP_ID}...`);
    await phalaCloud.upgrade({
      name: APP_ID,
      compose: COMPOSE_FILE_PATH,
      env: ENV_VARS
    });
    
    console.log('\n升级请求已提交!');
    
    // 持续检测升级状态
    console.log('\n开始监控升级状态...');
    console.log('升级过程通常需要1-2分钟，请耐心等待...');
    
    // 使用SDK的部署监控方法
    await phalaCloud.monitorDeploymentStatus(APP_ID, {
      // 状态变化回调
      onStatusChange: (status, cvm) => {
        console.log(`[${new Date().toLocaleTimeString()}] 实例状态更新: ${status}`);
      },
      // 成功回调
      onSuccess: (cvm) => {
        console.log('\n✅ 升级成功!');
        console.log('实例详情:');
        console.log(`  名称: ${cvm.name}`);
        console.log(`  状态: ${cvm.status}`);
        console.log(`  应用URL: ${cvm.app_url}`);
        
        if (cvm.app_url) {
          console.log(`\n您可以通过以下URL访问您的服务:`);
          console.log(`  ${cvm.app_url}`);
        }
      },
      // 失败回调
      onFailure: (status, cvm) => {
        console.log(`\n❌ 升级失败: ${status}`);
      },
      // 超时回调
      onTimeout: (cvm) => {
        console.log('\n⚠️ 超过最大等待时间(3分钟)，但升级可能仍在进行中');
        console.log('您可以稍后在Phala Cloud控制台检查升级状态');
        
        if (cvm) {
          console.log('\n当前实例状态:');
          console.log(`  名称: ${cvm.name}`);
          console.log(`  状态: ${cvm.status}`);
          console.log(`  应用URL: ${cvm.app_url}`);
        }
      }
    });
    
  } catch (error) {
    console.error('\n升级失败:', error);
    if (error.response && error.response.data) {
      console.error('错误响应数据:', JSON.stringify(error.response.data, null, 2));
    }
    if (error instanceof Error) {
      console.error('错误消息:', error.message);
      console.error('错误堆栈:', error.stack);
    }
  }
}

main(); 