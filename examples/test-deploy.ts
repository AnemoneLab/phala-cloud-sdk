import { PhalaCloud } from '../src';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config'; // 自动加载.env文件

/**
 * 此示例用于测试Phala Cloud SDK的部署功能
 * 与标准示例相比，该版本包含更多的调试信息
 */

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const API_KEY = process.env.PHALA_API_KEY; // 从环境变量获取API密钥
const DEPLOYMENT_NAME = 'anemone-agent-cvm'; // 部署的名称
const COMPOSE_FILE_PATH = path.join(__dirname, 'docker-compose.yml');

// 将SDK调试模式设置为开启
process.env.PHALA_SDK_DEBUG = 'true';

// 额外的环境变量(可选)
const ENV_VARS = [
  'API_SECRET=test-secret-here',
  'DEBUG=true'
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
    
    console.log('API密钥: ****' + API_KEY.substring(API_KEY.length - 4));
    console.log('使用compose文件:', COMPOSE_FILE_PATH);
    
    // 初始化SDK
    console.log('\n初始化Phala Cloud SDK...');
    const phalaCloud = new PhalaCloud({
      apiKey: API_KEY,
    });
    
    // 测试获取用户信息
    console.log('\n获取用户信息...');
    try {
      const userInfo = await phalaCloud.getUserInfo();
      console.log('用户信息:', JSON.stringify(userInfo, null, 2));
    } catch (error) {
      console.error('获取用户信息失败:', error.message);
    }
    
    console.log(`\n准备部署 ${DEPLOYMENT_NAME} 到Phala Cloud...`);
    
    // 部署容器
    console.log('\n执行部署操作...');
    const deployResult = await phalaCloud.deploy({
      type: 'phala',
      mode: 'docker-compose',
      name: DEPLOYMENT_NAME,
      compose: COMPOSE_FILE_PATH,
      env: ENV_VARS,
      vcpu: 1,
      memory: 2048,
      diskSize: 40,
      teepodId: 3,
      image: 'dstack-dev-0.3.5'
    });
    
    console.log('\n部署请求已提交!');
    console.log('应用ID:', deployResult.app_id);
    console.log('应用URL:', deployResult.app_url);
    
    // 持续检测部署状态
    console.log('\n开始监控部署状态...');
    console.log('部署过程通常需要1-2分钟，请耐心等待...');
    
    const maxRetries = 36; // 最多尝试36次，大约3分钟
    let retryCount = 0;
    let deploymentSuccessful = false;
    let lastStatus = '';
    
    while (retryCount < maxRetries && !deploymentSuccessful) {
      try {
        // 等待5秒
        console.log(`等待检查中 (${retryCount + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // 查询当前CVM状态
        const cvm = await phalaCloud.getCvmByAppId(deployResult.app_id);
        
        if (cvm) {
          if (lastStatus !== cvm.status) {
            lastStatus = cvm.status;
            console.log(`[${new Date().toLocaleTimeString()}] 实例状态更新: ${cvm.status}`);
          }
          
          // 检查状态是否为运行中
          if (cvm.status.toLowerCase() === 'running') {
            deploymentSuccessful = true;
            
            console.log('\n✅ 部署成功!');
            console.log('实例详情:');
            console.log(`  名称: ${cvm.name}`);
            console.log(`  状态: ${cvm.status}`);
            console.log(`  应用ID: ${cvm.app_id}`);
            console.log(`  实例ID: ${cvm.instance_id || 'N/A'}`);
            
            // 尝试获取应用网络信息，包括URL
            try {
              const networkInfo = await phalaCloud.getCvmNetwork(cvm.app_id);
              const appUrl = networkInfo.public_urls && networkInfo.public_urls.length > 0 
                ? networkInfo.public_urls[0].app 
                : '暂无';
              console.log(`  应用URL: ${appUrl}`);
              
              // 如果有HTTP端点，显示访问链接
              if (appUrl && appUrl !== '暂无') {
                console.log(`\n您可以通过以下URL访问您的服务:`);
                console.log(`  ${appUrl}`);
              }
            } catch (error) {
              console.error('获取应用网络信息失败:', error.message);
              console.log(`  应用URL: 获取失败`);
            }
            
            // 获取并显示日志URL
            const logsUrl = phalaCloud.getLogsUrl(cvm.app_id, DEPLOYMENT_NAME);
            console.log(`\n您可以通过以下URL查看应用日志:`);
            console.log(`  ${logsUrl}`);
            
            break;
          } else if (cvm.status.toLowerCase().includes('error') || 
                    cvm.status.toLowerCase().includes('fail')) {
            console.log(`\n❌ 部署失败: ${cvm.status}`);
            break;
          }
        } else {
          console.log('实例尚未创建，继续等待...');
        }
      } catch (error) {
        console.error('检查部署状态时出错:', error.message);
      }
      
      retryCount++;
    }
    
    if (!deploymentSuccessful) {
      if (retryCount >= maxRetries) {
        console.log('\n⚠️ 超过最大等待时间(3分钟)，但部署可能仍在进行中');
        console.log('您可以稍后在Phala Cloud控制台检查部署状态');
      }
      
      // 最后一次尝试获取实例信息
      try {
        const cvm = await phalaCloud.getCvmByAppId(deployResult.app_id);
        
        if (cvm) {
          console.log('\n当前实例状态:');
          console.log(`  名称: ${cvm.name}`);
          console.log(`  状态: ${cvm.status}`);
          console.log(`  应用ID: ${cvm.app_id}`);
          console.log(`  实例ID: ${cvm.instance_id || 'N/A'}`);
          
          // 尝试获取应用网络信息，包括URL
          try {
            const networkInfo = await phalaCloud.getCvmNetwork(cvm.app_id);
            const appUrl = networkInfo.public_urls && networkInfo.public_urls.length > 0 
              ? networkInfo.public_urls[0].app 
              : '暂无';
            console.log(`  应用URL: ${appUrl}`);
          } catch (error) {
            console.error('获取应用网络信息失败:', error.message);
            console.log(`  应用URL: 获取失败`);
          }
        }
      } catch (error) {
        console.error('获取最终实例状态失败:', error.message);
      }
    }
    
  } catch (error) {
    console.error('\n部署失败:', error);
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