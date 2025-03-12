import { PhalaCloud } from '../src';

// 创建SDK实例
const phalaCloud = new PhalaCloud({
  apiKey: 'YOUR_API_KEY_HERE',
  // apiUrl: 'OPTIONAL_CUSTOM_API_URL'
});

async function main() {
  try {
    // 获取用户信息
    const userInfo = await phalaCloud.getUserInfo();
    console.log('User info:', userInfo);

    // 列出所有CVM实例
    const cvms = await phalaCloud.listCvms();
    console.log(`Found ${cvms.length} CVM instances`);

    // 查看每个实例的基本信息
    cvms.forEach((cvm, index) => {
      console.log(`CVM #${index + 1}:`);
      console.log(`  Name: ${cvm.name}`);
      console.log(`  Status: ${cvm.status}`);
      console.log(`  App URL: ${cvm.hosted.app_url}`);
    });

    // 部署一个新的实例（需要有docker-compose.yml文件）
    /* 
    const deployResponse = await phalaCloud.deploy({
      type: 'phala',
      mode: 'docker-compose',
      name: 'my-app',
      compose: './docker-compose.yml',
      env: ['KEY1=value1', 'KEY2=value2']
    });
    console.log('Deployment successful:', deployResponse);
    */

  } catch (error) {
    console.error('Error:', error);
  }
}

main(); 