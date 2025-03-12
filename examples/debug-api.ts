import axios from "axios";
import 'dotenv/config';

/**
 * 调试脚本 - 测试Phala Cloud API连接
 * 直接使用axios调用API，以验证API端点和身份验证
 */
async function testApiConnection() {
  // 从环境变量获取API密钥
  const apiKey = process.env.PHALA_API_KEY;
  
  if (!apiKey) {
    console.error("错误: 未找到API密钥。请设置PHALA_API_KEY环境变量。");
    process.exit(1);
  }
  
  console.log("正在测试Phala Cloud API连接...");
  
  const headers = {
    "User-Agent": "debug-tester/1.0.0",
    "Content-Type": "application/json",
    "X-API-Key": apiKey
  };
  
  try {
    // 测试获取用户信息
    console.log("1. 测试用户认证API...");
    const authResponse = await axios.get("https://cloud-api.phala.network/api/v1/auth/me", {
      headers
    });
    console.log("认证API响应成功:", authResponse.status);
    console.log("用户名:", authResponse.data.username);
    
    // 测试获取用户ID
    console.log("\n2. 测试用户搜索API...");
    const username = authResponse.data.username;
    const searchResponse = await axios.get(`https://cloud-api.phala.network/api/v1/users/search?q=${username}`, {
      headers
    });
    console.log("用户搜索API响应成功:", searchResponse.status);
    console.log("用户ID:", searchResponse.data.users[0].id);
    
    // 测试获取所有CVM
    const userId = searchResponse.data.users[0].id;
    console.log("\n3. 测试CVM列表API...");
    const cvmsResponse = await axios.get(`https://cloud-api.phala.network/api/v1/cvms?user_id=${userId}`, {
      headers
    });
    console.log("CVM列表API响应成功:", cvmsResponse.status);
    console.log(`找到 ${cvmsResponse.data.length} 个CVM实例`);
    
    console.log("\nAPI连接测试成功! 所有端点都正常工作。");
  } catch (error) {
    console.error("API测试失败:", error.message);
    if (error.response) {
      console.error("状态码:", error.response.status);
      console.error("响应数据:", error.response.data);
    }
  }
}

// 运行测试
testApiConnection(); 