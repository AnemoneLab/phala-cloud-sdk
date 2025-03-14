import { PhalaCloud } from '../src';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
// chalk需要通过npm安装: npm install chalk
// @ts-ignore
import chalk from 'chalk';

// 加载环境变量
dotenv.config();

// 从环境变量获取API key和App ID
const API_KEY = process.env.PHALA_API_KEY;
const APP_ID = process.env.PHALA_APP_ID;

/**
 * 获取CVM证明信息的测试脚本
 * 
 * 使用方法:
 * 1. 安装chalk: npm install chalk
 * 2. 使用环境变量注入API key和App ID:
 *    export PHALA_API_KEY=your_api_key
 *    export PHALA_APP_ID=your_app_id
 *    ts-node test-attestation.ts
 * 
 * 可选环境变量:
 * - SAVE_TO_FILE=true: 将完整证明信息保存到文件
 */
async function main() {
  // 验证环境变量
  if (!API_KEY) {
    console.error(chalk.red('错误: 缺少PHALA_API_KEY环境变量'));
    console.log(chalk.yellow('提示: 您可以通过export命令设置环境变量:'));
    console.log(chalk.gray('  export PHALA_API_KEY=your-api-key'));
    console.log(chalk.gray('  export PHALA_APP_ID=your-app-id'));
    console.log(chalk.gray('  ts-node test-attestation.ts'));
    process.exit(1);
  }

  if (!APP_ID) {
    console.error(chalk.red('错误: 缺少PHALA_APP_ID环境变量'));
    console.log(chalk.yellow('提示: 您可以通过export命令设置环境变量:'));
    console.log(chalk.gray('  export PHALA_APP_ID=your-app-id'));
    process.exit(1);
  }

  console.log(chalk.blue('=== Phala Cloud SDK - 获取CVM证明信息测试 ==='));
  console.log(chalk.gray(`使用App ID: ${APP_ID}`));

  try {
    // 初始化Phala Cloud SDK
    const phalaCloud = new PhalaCloud({
      apiUrl: "https://phat.phala.network",
      apiKey: API_KEY
    });

    console.log(chalk.yellow('正在获取CVM证明信息...'));

    // 获取CVM证明信息
    const attestationData = await phalaCloud.getCvmAttestation(APP_ID);

    // 检查返回结果类型
    if (typeof attestationData === 'string') {
      console.error(chalk.red('错误: 获取到非预期的字符串响应'));
      console.log(chalk.gray('响应内容预览:'));
      console.log(chalk.gray((attestationData as string).substring(0, 200) + '...'));
      process.exit(1);
    }

    // 检查是否为HTML内容
    if (
      typeof attestationData === 'object' && 
      attestationData !== null && 
      typeof attestationData.toString === 'function' && 
      attestationData.toString().includes('<!DOCTYPE html>')
    ) {
      console.error(chalk.red('错误: 获取到HTML响应，可能API密钥已失效或需要重新登录'));
      console.log(chalk.gray('响应内容预览:'));
      console.log(chalk.gray(attestationData.toString().substring(0, 200) + '...'));
      process.exit(1);
    }

    // 验证返回的数据格式
    if (
      typeof attestationData !== 'object' || 
      attestationData === null || 
      !('tcb_info' in attestationData) || 
      !('app_certificates' in attestationData)
    ) {
      console.error(chalk.red('错误: 返回的数据格式不符合预期'));
      console.log(chalk.gray('返回的数据:'));
      console.log(attestationData);
      process.exit(1);
    }

    console.log(chalk.green('✓ 成功获取CVM证明信息'));
    
    // 输出证明信息的主要部分
    console.log('\n' + chalk.blue('=== 证明信息摘要 ==='));
    
    // TCB信息
    if (attestationData.tcb_info) {
      console.log(chalk.cyan('\n-- TCB信息 --'));
      console.log(chalk.gray('MRTD:'), attestationData.tcb_info.mrtd || 'N/A');
      console.log(chalk.gray('RootFS Hash:'), attestationData.tcb_info.rootfs_hash || 'N/A');
      console.log(chalk.gray('RTMR0:'), attestationData.tcb_info.rtmr0 || 'N/A');
      console.log(chalk.gray('RTMR1:'), attestationData.tcb_info.rtmr1 || 'N/A');
      console.log(chalk.gray('RTMR2:'), attestationData.tcb_info.rtmr2 || 'N/A');
      console.log(chalk.gray('RTMR3:'), attestationData.tcb_info.rtmr3 || 'N/A');
    }
    
    // 证书信息
    if (attestationData.app_certificates && attestationData.app_certificates.length > 0) {
      console.log(chalk.cyan('\n-- 证书信息 --'));
      
      attestationData.app_certificates.forEach((cert: any, index: number) => {
        console.log(chalk.gray(`\n证书 #${index + 1}:`));
        console.log(chalk.gray('  主题:'), cert.subject?.common_name || 'N/A');
        console.log(chalk.gray('  颁发者:'), cert.issuer?.common_name || 'N/A');
        console.log(chalk.gray('  序列号:'), cert.serial_number || 'N/A');
        console.log(chalk.gray('  有效期:'), `${cert.not_before || 'N/A'} 至 ${cert.not_after || 'N/A'}`);
        console.log(chalk.gray('  是否CA:'), cert.is_ca ? '是' : '否');
      });
    }
    
    // 如果存在compose文件，显示信息
    if (attestationData.compose_file) {
      console.log(chalk.cyan('\n-- Compose文件 --'));
      console.log(chalk.gray('长度:'), attestationData.compose_file.length, '字符');
      // 只显示前200个字符作为预览
      console.log(chalk.gray('预览:'), attestationData.compose_file.substring(0, 200) + '...');
    }
    
    // 可选: 保存完整信息到文件
    const saveToFile = process.env.SAVE_TO_FILE === 'true';
    if (saveToFile) {
      const outputPath = path.join(__dirname, 'attestation-output.json');
      fs.writeFileSync(outputPath, JSON.stringify(attestationData, null, 2));
      console.log(chalk.green(`\n完整证明信息已保存至: ${outputPath}`));
    } else {
      console.log(chalk.yellow('\n提示: 设置环境变量 SAVE_TO_FILE=true 可将完整证明信息保存到文件'));
    }

  } catch (error: any) {
    console.error(chalk.red('获取CVM证明信息失败:'));
    
    if (error.response) {
      const status = error.response.status;
      console.error(chalk.red(`  HTTP状态码: ${status}`));
      
      // 处理常见错误状态码
      if (status === 401 || status === 403) {
        console.error(chalk.red('  原因: API密钥无效或已过期'));
        console.log(chalk.yellow('  建议: 请检查API密钥是否正确，或在Phala Cloud控制台重新生成一个新的API密钥'));
      } else if (status === 404) {
        console.error(chalk.red('  原因: 找不到指定的应用'));
        console.log(chalk.yellow('  建议: 请检查App ID是否正确，确认CVM是否已部署且处于运行状态'));
      } else {
        console.error(chalk.red(`  响应数据: ${JSON.stringify(error.response.data)}`));
      }
    } else {
      console.error(chalk.red(`  错误信息: ${error.message}`));
    }
    
    process.exit(1);
  }
}

// 执行主函数
main().catch(error => {
  console.error(chalk.red('未捕获的错误:'), error);
  process.exit(1);
}); 