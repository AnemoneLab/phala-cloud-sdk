import { PhalaCloud } from '../src';
import 'dotenv/config';

/**
 * 此脚本用于测试部署状态监控功能
 * 
 * 使用方法:
 * ts-node test-deployment-status.ts <app_id>
 */

async function main() {
  try {
    // 验证参数
    if (process.argv.length < 3) {
      console.error('缺少必要参数: app_id');
      console.error('用法: ts-node test-deployment-status.ts <app_id>');
      process.exit(1);
    }
    
    const APP_ID = process.argv[2];
    const API_KEY = process.env.PHALA_API_KEY;
    
    // 验证API密钥是否存在
    if (!API_KEY) {
      console.error('错误: 缺少API密钥。请设置PHALA_API_KEY环境变量或在.env文件中配置。');
      process.exit(1);
    }
    
    console.log('API密钥: ****' + API_KEY.substring(API_KEY.length - 4));
    console.log('测试应用ID:', APP_ID);
    
    // 启用调试模式
    process.env.PHALA_SDK_DEBUG = 'true';
    
    // 初始化SDK
    console.log('\n初始化Phala Cloud SDK...');
    const phalaCloud = new PhalaCloud({
      apiKey: API_KEY,
    });
    
    // 首先尝试获取应用状态
    console.log(`\n尝试获取应用 ${APP_ID} 的初始状态...`);
    try {
      const cvm = await phalaCloud.getCvmByAppId(APP_ID);
      console.log('应用状态:', cvm.status);
      console.log('应用名称:', cvm.name);
      console.log('应用URL:', cvm.app_url);
    } catch (error) {
      console.error('获取应用状态失败:', error.message);
      console.error('将继续尝试监控，但可能失败...');
    }
    
    // 开始监控部署状态
    console.log('\n开始监控部署状态...');
    console.log('使用5秒间隔，最多监控3分钟');
    
    // 记录开始时间
    const startTime = Date.now();
    
    const finalStatus = await phalaCloud.monitorDeploymentStatus(APP_ID, {
      interval: 5000, // 5秒检查一次
      maxRetries: 36, // 最多尝试36次，约3分钟
      
      // 状态变化回调
      onStatusChange: (status, cvm) => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[${elapsed}s] 状态更新: ${status}`);
      },
      
      // 成功回调
      onSuccess: (cvm) => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`\n[${elapsed}s] ✅ 部署成功!`);
        console.log('实例详情:');
        console.log(`  名称: ${cvm.name}`);
        console.log(`  状态: ${cvm.status}`);
        console.log(`  应用URL: ${cvm.app_url}`);
      },
      
      // 失败回调
      onFailure: (status, cvm) => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`\n[${elapsed}s] ❌ 部署失败: ${status}`);
      },
      
      // 超时回调
      onTimeout: (cvm) => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`\n[${elapsed}s] ⚠️ 监控超时，部署可能仍在进行中`);
        
        if (cvm) {
          console.log('当前状态:', cvm.status);
        }
      },
      
      // 错误回调
      onError: (error) => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`\n[${elapsed}s] 💥 检查状态时出错:`, error.message);
      }
    });
    
    // 计算总耗时
    const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n监控结束，总耗时: ${totalElapsed}秒`);
    
    if (finalStatus) {
      console.log('\n最终状态:', finalStatus.status);
    } else {
      console.log('\n未能获取最终状态');
    }
    
  } catch (error) {
    console.error('监控测试失败:', error);
  }
}

main(); 