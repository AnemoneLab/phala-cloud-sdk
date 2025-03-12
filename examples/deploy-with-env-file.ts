import { PhalaCloud } from '../src';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import 'dotenv/config'; // 自动加载.env文件

/**
 * 此示例演示如何使用环境变量文件部署Docker容器到TEE环境
 * 
 * 要运行此示例，您需要:
 * 1. 设置环境变量PHALA_API_KEY或在.env文件中配置
 * 2. docker-compose.yml文件
 * 3. .env文件或类似的环境变量文件
 * 
 * 环境变量设置方式:
 * - 直接设置: `export PHALA_API_KEY=your_api_key_here`
 * - 或在.env文件中设置: `PHALA_API_KEY=your_api_key_here`
 * 
 * 运行命令: 
 * ts-node deploy-with-env-file.ts
 */

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const API_KEY = process.env.PHALA_API_KEY; // 从环境变量获取API密钥
const DEPLOYMENT_NAME = 'anemone-agent-with-env'; // 部署的名称
const COMPOSE_FILE_PATH = path.join(__dirname, 'docker-compose.yml');
const ENV_FILE_PATH = path.join(__dirname, '.env.example'); // 使用您的实际.env文件

// 创建示例.env文件（实际使用时请删除这段代码并使用您自己的.env文件）
async function setupEnvFile() {
  if (!await fs.pathExists(ENV_FILE_PATH)) {
    console.log(`创建示例环境变量文件: ${ENV_FILE_PATH}`);
    await fs.copyFile(path.join(__dirname, '.env.example'), ENV_FILE_PATH);
  }
}

async function main() {
  try {
    await setupEnvFile();
    
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
    console.log(`使用配置文件: ${COMPOSE_FILE_PATH}`);
    console.log(`使用环境变量文件: ${ENV_FILE_PATH}`);
    
    // 部署容器，使用环境变量文件
    const deployResult = await phalaCloud.deploy({
      type: 'phala',
      mode: 'docker-compose',
      name: DEPLOYMENT_NAME,
      compose: COMPOSE_FILE_PATH,
      envFile: ENV_FILE_PATH
    });
    
    console.log('部署成功!');
    console.log('应用ID:', deployResult.app_id);
    console.log('应用URL:', deployResult.app_url);
    
    // 等待一些时间让部署生效
    console.log('等待部署完成...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 获取特定CVM的详细信息
    console.log('获取部署详情...');
    const cvmDetails = await phalaCloud.getCvmByAppId(deployResult.app_id);
    
    console.log('部署详情:');
    console.log(`  名称: ${cvmDetails.name}`);
    console.log(`  应用ID: ${cvmDetails.app_id}`);
    console.log(`  状态: ${cvmDetails.status}`);
    console.log(`  应用URL: ${cvmDetails.app_url}`);
    
    console.log('\n您现在可以在浏览器中访问您的应用:');
    console.log(cvmDetails.app_url);
    
  } catch (error) {
    console.error('部署失败:', error);
    if (error instanceof Error) {
      console.error('错误消息:', error.message);
    }
  }
}

main(); 