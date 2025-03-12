import { PhalaCloud } from '../src';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config'; // 自动加载.env文件

/**
 * 此示例演示如何使用Phala Cloud SDK部署Docker容器到TEE环境
 * 
 * 要运行此示例，您需要:
 * 1. 设置环境变量PHALA_API_KEY或在.env文件中配置
 * 2. 确保docker-compose.yml文件在同一目录中
 * 
 * 环境变量设置方式:
 * - 直接设置: `export PHALA_API_KEY=your_api_key_here`
 * - 或在.env文件中设置: `PHALA_API_KEY=your_api_key_here`
 * 
 * 运行命令: 
 * ts-node deploy-container.ts
 */

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const API_KEY = process.env.PHALA_API_KEY; // 从环境变量获取API密钥
const DEPLOYMENT_NAME = 'anemone-agent-cvm'; // 部署的名称
const COMPOSE_FILE_PATH = path.join(__dirname, 'docker-compose.yml');

// 额外的环境变量(可选)
const ENV_VARS = [
  'API_SECRET=your-secret-here',
  'DEBUG=false'
];

async function main() {
  try {
    // 验证API密钥是否存在
    if (!API_KEY) {
      console.error('错误: 缺少API密钥。请设置PHALA_API_KEY环境变量或在.env文件中配置。');
      console.error('可以通过以下方式设置:');
      console.error('- 直接设置环境变量: export PHALA_API_KEY=your_api_key_here');
      console.error('- 或在.env文件中添加: PHALA_API_KEY=your_api_key_here');
      process.exit(1);
    }
    
    // 初始化SDK
    const phalaCloud = new PhalaCloud({
      apiKey: API_KEY,
    });
    
    console.log(`正在部署 ${DEPLOYMENT_NAME} 到Phala Cloud...`);
    
    // 部署容器
    const deployResult = await phalaCloud.deploy({
      type: 'phala',
      mode: 'docker-compose',
      name: DEPLOYMENT_NAME,
      compose: COMPOSE_FILE_PATH,
      env: ENV_VARS
    });
    
    console.log('部署成功!');
    console.log('应用ID:', deployResult.app_id);
    console.log('应用URL:', deployResult.app_url);
    
    // 获取所有CVM实例以确认部署
    const allCvms = await phalaCloud.listCvms();
    console.log(`当前有 ${allCvms.length} 个活跃的CVM实例`);
    
    // 查找我们刚刚部署的实例
    const ourCvm = allCvms.find(cvm => cvm.hosted.app_id === deployResult.app_id);
    if (ourCvm) {
      console.log(`我们的实例状态: ${ourCvm.status}`);
      console.log(`实例详情:`);
      console.log(`  名称: ${ourCvm.name}`);
      console.log(`  状态: ${ourCvm.status}`);
      console.log(`  应用URL: ${ourCvm.hosted.app_url}`);
      console.log(`  创建时间: ${ourCvm.hosted.configuration.created_at || 'N/A'}`);
    }
    
  } catch (error) {
    console.error('部署失败:', error);
    if (error instanceof Error) {
      console.error('错误消息:', error.message);
    }
  }
}

main(); 