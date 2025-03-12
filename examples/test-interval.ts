/**
 * 此脚本用于测试定时器的准确性
 */

async function main() {
  console.log('开始测试定时器间隔...');
  
  const count = 10;
  const targetInterval = 5000; // 5秒
  
  for (let i = 0; i < count; i++) {
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] 开始第 ${i + 1} 次等待 (${targetInterval}ms)...`);
    
    // 使用Promise和setTimeout实现等待
    await new Promise(resolve => setTimeout(resolve, targetInterval));
    
    const endTime = Date.now();
    const actualInterval = endTime - startTime;
    const diff = actualInterval - targetInterval;
    
    console.log(`[${new Date().toISOString()}] 完成第 ${i + 1} 次等待，实际用时: ${actualInterval}ms (差异: ${diff}ms)`);
  }
  
  console.log('定时器测试完成！');
}

main().catch(error => {
  console.error('测试失败:', error);
}); 