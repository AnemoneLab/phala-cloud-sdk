import { PhalaCloud } from '../src';
import 'dotenv/config';

/**
 * 此脚本用于测试getCvmByAppId功能是否正常工作
 * 
 * 使用方法:
 * ts-node test-getcvm.ts <app_id>
 */

async function main() {
  try {
    // 验证参数
    if (process.argv.length < 3) {
      console.error('缺少必要参数: app_id');
      console.error('用法: ts-node test-getcvm.ts <app_id>');
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
    console.log('测试获取应用ID:', APP_ID);
    
    // 启用调试模式
    process.env.PHALA_SDK_DEBUG = 'true';
    
    // 初始化SDK
    console.log('\n初始化Phala Cloud SDK...');
    const phalaCloud = new PhalaCloud({
      apiKey: API_KEY,
    });
    
    // 测试获取CVM信息
    console.log(`\n测试获取应用 ${APP_ID} 的信息...`);
    console.time('API调用时间');
    
    try {
      const cvm = await phalaCloud.getCvmByAppId(APP_ID);
      console.timeEnd('API调用时间');
      
      console.log('\n成功获取CVM信息:');
      console.log('名称:', cvm.name);
      console.log('状态:', cvm.status);
      console.log('应用URL:', cvm.app_url);
      
      // 完整信息
      console.log('\n完整CVM信息:');
      console.log(JSON.stringify(cvm, null, 2));
    } catch (error) {
      console.timeEnd('API调用时间');
      console.error('\n获取CVM信息失败:', error);
      if (error.response) {
        console.error('错误响应:', error.response.data);
      }
    }
    
    // 测试网络延迟
    console.log('\n测试网络延迟...');
    console.time('用户信息获取时间');
    try {
      const userInfo = await phalaCloud.getUserInfo();
      console.timeEnd('用户信息获取时间');
      console.log('用户名:', userInfo.username);
    } catch (error) {
      console.timeEnd('用户信息获取时间');
      console.error('获取用户信息失败:', error);
    }
  } catch (error) {
    console.error('测试失败:', error);
  }
}

main(); 