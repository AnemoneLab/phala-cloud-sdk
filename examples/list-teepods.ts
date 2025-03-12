import { PhalaCloud } from '../src';
import 'dotenv/config'; // 自动加载.env文件

/**
 * 此示例演示如何查询可用的teepods
 * 
 * 要运行此示例，您需要:
 * 设置环境变量PHALA_API_KEY或在.env文件中配置
 * 
 * 运行命令:
 * tsx examples/list-teepods.ts
 */

// 启用调试模式
process.env.PHALA_SDK_DEBUG = 'true';

// 从环境变量获取API密钥
const API_KEY = process.env.PHALA_API_KEY;

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
    
    // 初始化SDK
    console.log('\n初始化Phala Cloud SDK...');
    const phalaCloud = new PhalaCloud({
      apiKey: API_KEY,
    });
    
    // 查询teepods
    console.log('\n查询可用的teepods...');
    try {
      const teepods = await phalaCloud.listTeepods();
      
      if (!teepods || teepods.length === 0) {
        console.log('未找到可用的teepods');
        return;
      }
      
      console.log(`找到 ${teepods.length} 个teepods:`);
      console.log('\nteepod详情:');
      console.log('-----------------------------------------------------');
      console.log('ID\t名称\t\t状态\t\t可用性');
      console.log('-----------------------------------------------------');
      
      teepods.forEach((teepod: any) => {
        console.log(`${teepod.id}\t${teepod.name}\t${teepod.status}\t${teepod.available ? '可用' : '不可用'}`);
      });
      
      console.log('\n部署时使用的推荐teepod_id:');
      const availableTeepods = teepods.filter((teepod: any) => teepod.available && teepod.status === 'online');
      if (availableTeepods.length > 0) {
        console.log(`推荐使用 teepod_id: ${availableTeepods[0].id} (${availableTeepods[0].name})`);
        console.log('\n在部署配置中使用此ID:');
        console.log(`
const vm_config = {
  teepod_id: ${availableTeepods[0].id}, // 使用此可用的teepod_id
  // ... 其他配置
};
        `);
      } else {
        console.log('没有可用的teepods，请稍后再试');
      }
      
    } catch (error) {
      console.error('查询teepods失败:', error);
      if (error.response && error.response.data) {
        console.error('错误响应数据:', JSON.stringify(error.response.data, null, 2));
      }
      if (error instanceof Error) {
        console.error('错误消息:', error.message);
      }
    }
    
  } catch (error) {
    console.error('执行失败:', error);
    if (error instanceof Error) {
      console.error('错误消息:', error.message);
    }
  }
}

main(); 