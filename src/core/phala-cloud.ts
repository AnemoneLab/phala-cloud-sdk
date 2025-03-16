import { ApiClient } from './api-client';
import {
  CreateCvmResponse,
  DeployOptions,
  Env,
  GetCvmAttestationResponse,
  GetCvmByAppIdResponse,
  GetCvmCompositionResponse,
  GetCvmsByUserIdResponse,
  GetCvmStatsResponse,
  GetPubkeyFromCvmResponse,
  GetUserInfoResponse,
  PhalaCloudConfig,
  StartCvmResponse,
  StopCvmResponse,
  UpdateComposeOptions,
  UpdateComposeResponse,
  UpgradeCvmResponse,
  UpgradeOptions,
} from '../types';
import { DEFAULT_CLOUD_API_URL } from './constants';
import { logger } from '../utils/logger';
import fs from 'fs-extra';
import { encryptSecrets } from '../utils/crypto';

/**
 * Phala Cloud SDK 主类
 */
export class PhalaCloud {
  public readonly apiClient: ApiClient;

  /**
   * 构造一个新的PhalaCloud SDK实例
   * @param config - 配置选项
   */
  constructor(config: PhalaCloudConfig = {}) {
    const { apiUrl = DEFAULT_CLOUD_API_URL, apiKey } = config;
    this.apiClient = new ApiClient(apiUrl, apiKey);
    logger.debug('PhalaCloud SDK initialized');
  }

  /**
   * 获取当前用户信息
   * @returns 用户信息响应
   */
  async getUserInfo(): Promise<GetUserInfoResponse> {
    logger.debug('Getting user info');
    return this.apiClient.get<GetUserInfoResponse>('/api/v1/auth/me');
  }

  /**
   * 获取当前用户的所有CVM实例
   * @returns CVM实例数组
   */
  async listCvms(): Promise<GetCvmsByUserIdResponse> {
    logger.debug('Listing CVMs');
    return this.apiClient.get<GetCvmsByUserIdResponse>(`/api/v1/cvms`);
  }

  /**
   * 通过应用ID获取CVM信息
   * @param appId - 应用ID
   * @param timeout - 超时时间(毫秒)，默认15秒
   * @returns CVM信息
   */
  async getCvmByAppId(appId: string, timeout?: number): Promise<GetCvmByAppIdResponse> {
    logger.debug(`Getting CVM by app ID: ${appId}`);
    
    // 使用自定义超时设置
    const config = timeout ? { timeout } : undefined;
    
    try {
      return await this.apiClient.get<GetCvmByAppIdResponse>(`/api/v1/cvms/app_${appId}`, config);
    } catch (error: any) {
      // 记录特定的错误信息
      if (error.code === 'ECONNABORTED') {
        logger.error(`请求超时: 获取应用 ${appId} 信息时超时`);
      } else if (error.response) {
        logger.error(`获取应用 ${appId} 信息失败: 状态码 ${error.response.status}`);
      } else {
        logger.error(`获取应用 ${appId} 信息失败: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 获取CVM的公钥
   * @param appId - 应用ID
   * @returns 公钥信息
   */
  async getPubkeyFromCvm(appId: string): Promise<GetPubkeyFromCvmResponse> {
    logger.debug(`Getting pubkey for CVM with app ID: ${appId}`);
    return this.apiClient.get<GetPubkeyFromCvmResponse>(`/api/v1/cvms/app_${appId}/pubkey`);
  }

  /**
   * 部署Docker Compose到Phala TEE Cloud
   * @param options - 部署选项
   * @returns 部署响应
   */
  async deploy(options: DeployOptions): Promise<CreateCvmResponse> {
    // 验证必要的选项
    if (!options.type || options.type !== "phala") {
      throw new Error("The type option is required. Currently only phala is supported.");
    }
    if (!options.mode || options.mode !== "docker-compose") {
      throw new Error("The mode option is required. Currently only docker-compose is supported.");
    }
    if (!options.name) {
      throw new Error("The name option is required.");
    }
    if (!options.compose) {
      throw new Error("The compose option is required.");
    }

    // 处理环境变量
    options.envs = this.parseEnv(options.env || [], options.envFile || "");

    // 读取compose文件内容
    const composeContent = await fs.readFile(options.compose, 'utf-8');
    
    logger.debug(`Deploying ${options.name} with compose file ${options.compose}`);
    
    // 如果没有指定teepod_id，则自动查找可用的teepod
    let teepodId = options.teepodId || 3; // 默认使用teepod_id 3
    if (!teepodId) {
      logger.debug('No teepod_id specified, finding available teepods...');
      try {
        const teepods = await this.listTeepods();
        
        if (!teepods || teepods.length === 0) {
          throw new Error('未找到可用的teepods，请稍后再试');
        }
        
        // 查找可用的teepod
        const availableTeepods = teepods.filter((teepod: any) => teepod.available && teepod.status === 'online');
        if (availableTeepods.length === 0) {
          throw new Error('没有可用的teepods，请稍后再试');
        }
        
        teepodId = availableTeepods[0].id;
        logger.debug(`Automatically selected teepod_id: ${teepodId}`);
      } catch (error: any) {
        throw new Error(`无法查询可用的teepods: ${error.message}`);
      }
    }
    
    // 准备vm_config对象 - 匹配CLI中的结构
    const vm_config = {
      teepod_id: teepodId, // 使用查询到的或用户提供的teepod_id
      name: options.name,
      image: options.image || "dstack-dev-0.3.5", // 默认镜像更新为0.3.5版本
      vcpu: options.vcpu || 1,
      memory: options.memory || 2048,
      disk_size: options.diskSize || 40,
      compose_manifest: {
        docker_compose_file: composeContent,
        docker_config: {
          url: "",
          username: "",
          password: "",
        },
        features: ["kms", "tproxy-net"],
        kms_enabled: true,
        manifest_version: 2,
        name: options.name,
        public_logs: true,
        public_sysinfo: true,
        tproxy_enabled: true,
      },
      listed: false,
    };
    
    logger.debug('Prepared VM config for deployment');
    
    // 1. 获取公钥 - 这是CLI中的关键步骤
    logger.debug('Retrieving encryption pubkey from CVM...');
    const pubkeyResponse = await this.apiClient.post<GetPubkeyFromCvmResponse>('/api/v1/cvms/pubkey/from_cvm_configuration', vm_config);
    
    if (!pubkeyResponse || !pubkeyResponse.app_env_encrypt_pubkey) {
      throw new Error('Failed to get encryption pubkey from CVM');
    }
    
    const app_env_encrypt_pubkey = pubkeyResponse.app_env_encrypt_pubkey;
    const app_id_salt = pubkeyResponse.app_id_salt;
    
    logger.debug(`Got pubkey: ${app_env_encrypt_pubkey}`);
    
    // 2. 加密环境变量 - 这也是CLI中的关键步骤
    let encrypted_env = '';
    if (options.envs && options.envs.length > 0) {
      logger.debug(`Encrypting ${options.envs.length} environment variables`);
      encrypted_env = await encryptSecrets(options.envs, app_env_encrypt_pubkey);
      logger.debug('Environment variables encrypted successfully');
    }
    
    // 3. 将加密的环境变量和公钥添加到请求体中
    const final_payload = {
      ...vm_config,
      encrypted_env,
      app_env_encrypt_pubkey,
      app_id_salt,
    };
    
    // 发送部署请求
    logger.debug('Sending deployment request with encrypted environment variables');
    return this.apiClient.post<CreateCvmResponse>('/api/v1/cvms/from_cvm_configuration', final_payload);
  }

  /**
   * 升级现有的TEE部署
   * @param options - 升级选项
   * @returns 升级响应
   */
  async upgrade(options: UpgradeOptions): Promise<UpgradeCvmResponse> {
    // 验证必要的选项
    if (!options.name) {
      throw new Error("The name option is required.");
    }
    if (!options.compose) {
      throw new Error("The compose option is required.");
    }

    // 处理环境变量
    options.envs = this.parseEnv(options.env || [], options.envFile || "");

    // 读取compose文件内容
    const composeContent = await fs.readFile(options.compose, 'utf-8');

    logger.debug(`Upgrading ${options.name} with compose file ${options.compose}`);
    
    // 获取CVM信息以获取加密公钥
    logger.debug(`Retrieving CVM details for ${options.name}`);
    const cvm = await this.getCvmByAppId(options.name);
    
    // 构造请求体基础部分
    const vm_config = {
      compose_manifest: {
        docker_compose_file: composeContent,
        manifest_version: 1,
        runner: "docker-compose",
        version: "1.0.0",
        features: ["kms", "tproxy-net"],
        name: `app_${options.name}`,
      },
      allow_restart: true,
    };
    
    // 加密环境变量
    let encrypted_env = '';
    if (options.envs && options.envs.length > 0 && cvm.encrypted_env_pubkey) {
      logger.debug(`Encrypting ${options.envs.length} environment variables for upgrade`);
      encrypted_env = await encryptSecrets(options.envs, cvm.encrypted_env_pubkey);
      logger.debug('Environment variables encrypted successfully');
    }
    
    // 构造最终请求体
    const final_payload = {
      ...vm_config,
      encrypted_env
    };

    // 发送升级请求
    logger.debug('Sending upgrade request');
    return this.apiClient.post<UpgradeCvmResponse>(`/api/v1/cvms/app_${options.name}/compose`, final_payload);
  }

  /**
   * 解析环境变量
   * @param envs - 环境变量字符串数组
   * @param envFile - 环境变量文件路径
   * @returns 环境变量对象数组
   * @private
   */
  private parseEnv(envs: string[], envFile: string): Env[] {
    // 处理环境变量
    const envVars: Record<string, string> = {};
    
    // 从命令行参数解析
    if (envs && envs.length > 0) {
      for (const env of envs) {
        if (env.includes("=")) {
          const [key, value] = env.split("=");
          if (key && value) {
            envVars[key] = value;
          }
        }
      }
    }

    // 从文件解析
    if (envFile && fs.existsSync(envFile)) {
      const envFileContent = fs.readFileSync(envFile, "utf8");
      for (const line of envFileContent.split("\n")) {
        if (line.includes("=")) {
          const [key, value] = line.split("=");
          if (key && value) {
            envVars[key] = value;
          }
        }
      }
    }

    // 转换为数组格式
    return Object.entries(envVars).map(([key, value]) => ({
      key,
      value,
    }));
  }

  /**
   * 获取可用的teepods列表
   * @returns teepods信息
   */
  async listTeepods(): Promise<any[]> {
    logger.debug('Listing available teepods');
    try {
      const response = await this.apiClient.get('/api/v1/teepods');
      const teepods = response.data || [];
      logger.debug(`Found ${teepods.length} teepods`);
      return teepods;
    } catch (error: any) {
      logger.error('Failed to list teepods:', error);
      throw new Error(`Failed to list teepods: ${error.message}`);
    }
  }

  /**
   * 监控部署或升级状态
   * @param appId 应用ID
   * @param options 监控选项
   * @returns 最终部署状态
   */
  async monitorDeploymentStatus(
    appId: string,
    options: {
      /**
       * 检查间隔时间(毫秒)
       * @default 5000
       */
      interval?: number;
      /**
       * 最大尝试次数
       * @default 36 (约3分钟)
       */
      maxRetries?: number;
      /**
       * 状态查询超时时间(毫秒)
       * @default 8000
       */
      queryTimeout?: number;
      /**
       * 状态变化回调函数
       */
      onStatusChange?: (status: string, cvm: any) => void;
      /**
       * 成功回调函数
       */
      onSuccess?: (cvm: any) => void;
      /**
       * 失败回调函数
       */
      onFailure?: (status: string, cvm: any) => void;
      /**
       * 超时回调函数
       */
      onTimeout?: (cvm: any | null) => void;
      /**
       * 错误回调函数
       */
      onError?: (error: any) => void;
    } = {}
  ): Promise<any> {
    const {
      interval = 5000,
      maxRetries = 36,
      queryTimeout = 8000,
      onStatusChange,
      onSuccess,
      onFailure,
      onTimeout,
      onError
    } = options;

    logger.debug(`Monitoring deployment status for app ID: ${appId}`);
    logger.debug(`Settings: interval=${interval}ms, maxRetries=${maxRetries}, queryTimeout=${queryTimeout}ms`);

    let retryCount = 0;
    let deploymentSuccessful = false;
    let lastStatus = '';
    let finalCvm = null;
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 3; // 最多允许连续3次错误

    while (retryCount < maxRetries && !deploymentSuccessful) {
      const startTime = Date.now(); // 记录每次循环开始时间
      let thisLoopHadError = false;
      
      try {
        // 查询当前CVM状态，使用更短的超时时间
        logger.debug(`Checking deployment status (attempt ${retryCount + 1}/${maxRetries})...`);
        const cvm = await this.getCvmByAppId(appId, queryTimeout);
        finalCvm = cvm;
        consecutiveErrors = 0; // 重置连续错误计数
        
        if (lastStatus !== cvm.status) {
          lastStatus = cvm.status;
          logger.debug(`Status changed to: ${cvm.status}`);
          
          if (onStatusChange) {
            onStatusChange(cvm.status, cvm);
          }
        }
        
        // 检查状态是否为运行中
        if (cvm.status.toLowerCase() === 'running') {
          deploymentSuccessful = true;
          logger.debug('Deployment successful! Instance is running.');
          
          // 尝试获取网络信息（包括应用URL）
          try {
            const networkInfo = await this.getCvmNetwork(appId);
            if (networkInfo && networkInfo.public_urls && networkInfo.public_urls.length > 0) {
              finalCvm.app_url = networkInfo.public_urls[0].app;
              logger.debug(`Application URL: ${finalCvm.app_url}`);
            }
          } catch (error: any) {
            logger.error('Failed to get network information:', error.message);
          }
          
          if (onSuccess) {
            onSuccess(finalCvm);
          }
          
          break;
        } else if (cvm.status.toLowerCase().includes('error') || 
                   cvm.status.toLowerCase().includes('fail')) {
          logger.error(`Deployment failed with status: ${cvm.status}`);
          
          if (onFailure) {
            onFailure(cvm.status, cvm);
          }
          
          break;
        }
      } catch (error: any) {
        thisLoopHadError = true;
        consecutiveErrors++;
        logger.error(`Error checking deployment status (${consecutiveErrors}/${maxConsecutiveErrors}):`, error.message);
        
        if (onError) {
          onError(error);
        }
        
        // 如果连续错误次数太多，暂停一段时间后继续
        if (consecutiveErrors >= maxConsecutiveErrors) {
          logger.warn(`Too many consecutive errors (${consecutiveErrors}), pausing for recovery...`);
          await new Promise(resolve => setTimeout(resolve, interval * 2));
          consecutiveErrors = Math.max(0, consecutiveErrors - 1); // 减少错误计数而不是完全重置
        }
      }
      
      retryCount++;
      
      // 如果本次循环没有遇到错误，则正常等待下一次检查
      // 如果有错误，则使用较短的等待时间更快地重试
      const waitMultiplier = thisLoopHadError ? 0.5 : 1.0;
      
      // 计算本次循环已经使用的时间，确保间隔准确
      const elapsedTime = Date.now() - startTime;
      const targetWaitTime = interval * waitMultiplier;
      const remainingWaitTime = Math.max(0, targetWaitTime - elapsedTime);
      
      if (retryCount < maxRetries && !deploymentSuccessful) {
        logger.debug(`Waiting ${remainingWaitTime}ms before next check...`);
        // 等待剩余的时间
        await new Promise(resolve => setTimeout(resolve, remainingWaitTime));
      }
    }
    
    // 超时处理
    if (retryCount >= maxRetries && !deploymentSuccessful) {
      logger.warn(`Maximum retries (${maxRetries}) reached, but deployment may still be in progress`);
      
      if (onTimeout) {
        onTimeout(finalCvm);
      }
    }
    
    return finalCvm;
  }

  /**
   * 获取CVM的网络信息，包括应用URL
   * @param appId - 应用ID
   * @returns 网络信息响应
   */
  async getCvmNetwork(appId: string): Promise<any> {
    logger.debug(`Getting network info for CVM with app ID: ${appId}`);
    try {
      return this.apiClient.get<any>(`/api/v1/cvms/app_${appId}/network`);
    } catch (error: any) {
      logger.error(`获取应用 ${appId} 网络信息失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取CVM的证明信息
   * @param identifier - CVM标识符，可以是app_id或CVM的ID
   * @returns CVM的证明信息，包括证书链、TCB信息和compose文件
   */
  async getCvmAttestation(identifier: string): Promise<GetCvmAttestationResponse> {
    logger.debug(`获取CVM的证明信息: ${identifier}`);
    
    try {
      // 如果标识符不是以app_开头，则添加app_前缀
      const id = identifier.startsWith('app_') ? identifier : `app_${identifier}`;
      return await this.apiClient.get<GetCvmAttestationResponse>(`/api/v1/cvms/${id}/attestation`);
    } catch (error: any) {
      // 记录错误信息
      if (error.response) {
        logger.error(`获取CVM证明信息失败: 状态码 ${error.response.status}`);
        logger.debug(`错误详情: ${JSON.stringify(error.response.data)}`);
      } else {
        logger.error(`获取CVM证明信息失败: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 获取应用日志URL
   * @param appId - 应用ID
   * @param containerName - 容器名称
   * @param options - 日志选项
   * @returns 日志URL
   */
  getLogsUrl(
    appId: string, 
    containerName: string, 
    options: {
      port?: number;
      tail?: number;
      follow?: boolean;
      timestamps?: boolean;
      bare?: boolean;
      text?: boolean;
    } = {}
  ): string {
    const {
      port = 8090, // 默认日志端口为8090
      tail = 400,
      follow = true,
      timestamps = true,
      bare = true,
      text = true
    } = options;
    
    // 构建参数字符串
    const params = [];
    if (text) params.push('text');
    if (bare) params.push('bare');
    if (timestamps) params.push('timestamps');
    if (follow) params.push('follow');
    if (tail) params.push(`tail=${tail}`);
    
    // 构建URL
    const baseUrl = `https://${appId}-${port}.dstack-prod5.phala.network`;
    const urlPath = `/logs/${containerName}`;
    const queryString = params.length > 0 ? `?${params.join('&')}` : '';
    
    return `${baseUrl}${urlPath}${queryString}`;
  }

  /**
   * 更新Compose配置
   * @param options - 更新Compose配置选项
   * @returns 更新响应
   */
  async updateCompose(options: UpdateComposeOptions): Promise<UpdateComposeResponse> {
    // 验证必要的选项
    if (!options.identifier) {
      throw new Error("应用标识符(identifier)是必需的");
    }
    if (!options.compose) {
      throw new Error("Compose文件路径(compose)是必需的");
    }

    // 处理环境变量
    options.envs = this.parseEnv(options.env || [], options.envFile || "");

    // 读取compose文件内容
    const composeContent = await fs.readFile(options.compose, 'utf-8');
    
    logger.debug(`更新 ${options.identifier} 的Compose配置，使用文件 ${options.compose}`);
    
    // 标准化标识符格式
    const identifier = options.identifier.startsWith('app_') 
      ? options.identifier 
      : `app_${options.identifier}`;
    
    // 获取CVM信息以获取加密公钥
    logger.debug(`获取 ${options.identifier} 的CVM详情`);
    const cvm = await this.getCvmByAppId(options.identifier.replace('app_', ''));
    
    // 构造compose_manifest对象
    const compose_manifest = {
      docker_compose_file: composeContent,
      docker_config: options.dockerConfig || {
        password: "",
        username: "",
        registry: ""
      },
      features: options.features || ["kms", "tproxy-net"],
      kms_enabled: options.kmsEnabled !== undefined ? options.kmsEnabled : true,
      manifest_version: 1,
      name: identifier,
      pre_launch_script: options.preLaunchScript || "",
      bash_script: options.bashScript || "",
      public_logs: options.publicLogs !== undefined ? options.publicLogs : true,
      public_sysinfo: options.publicSysinfo !== undefined ? options.publicSysinfo : true,
      tproxy_enabled: options.tproxyEnabled !== undefined ? options.tproxyEnabled : true,
      runner: "docker-compose",
      version: "1.0.0"
    };
    
    // 加密环境变量
    let encrypted_env = '';
    if (options.envs && options.envs.length > 0 && cvm.encrypted_env_pubkey) {
      logger.debug(`为更新加密 ${options.envs.length} 个环境变量`);
      encrypted_env = await encryptSecrets(options.envs, cvm.encrypted_env_pubkey);
      logger.debug('环境变量加密成功');
    }
    
    // 构造请求体
    const payload = {
      id: identifier,
      compose_manifest,
      encrypted_env,
      allow_restart: options.allowRestart !== undefined ? (options.allowRestart ? 1 : 0) : 1
    };

    // 发送PUT请求更新Compose配置
    logger.debug('发送更新Compose配置请求');
    return this.apiClient.put<UpdateComposeResponse>(`/api/v1/cvms/${identifier}/compose`, payload);
  }

  /**
   * 获取CVM的系统状态信息
   * @param identifier - CVM标识符，可以是app_id或CVM的ID
   * @param timeout - 超时时间(毫秒)，默认8秒
   * @returns CVM的系统状态信息，包括CPU、内存、磁盘等
   */
  async getCvmStats(identifier: string, timeout?: number): Promise<GetCvmStatsResponse> {
    logger.debug(`获取CVM的系统状态信息: ${identifier}`);
    
    // 使用自定义超时设置
    const config = timeout ? { timeout } : undefined;
    
    try {
      // 如果标识符不是以app_开头，则添加app_前缀
      const id = identifier.startsWith('app_') ? identifier : `app_${identifier}`;
      return await this.apiClient.get<GetCvmStatsResponse>(`/api/v1/cvms/${id}/stats`, config);
    } catch (error: any) {
      // 记录错误信息
      if (error.response) {
        logger.error(`获取CVM系统状态信息失败: 状态码 ${error.response.status}`);
        logger.debug(`错误详情: ${JSON.stringify(error.response.data)}`);
      } else if (error.code === 'ECONNABORTED') {
        logger.error(`请求超时: 获取CVM ${identifier} 系统状态信息时超时`);
      } else {
        logger.error(`获取CVM系统状态信息失败: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 获取CVM的组合信息
   * @param identifier - CVM标识符，可以是app_id或CVM的ID
   * @param timeout - 超时时间(毫秒)，默认8秒
   * @returns CVM的组合信息，包括Docker Compose配置和容器状态
   */
  async getCvmComposition(identifier: string, timeout?: number): Promise<GetCvmCompositionResponse> {
    logger.debug(`获取CVM的组合信息: ${identifier}`);
    
    // 使用自定义超时设置
    const config = timeout ? { timeout } : undefined;
    
    try {
      // 如果标识符不是以app_开头，则添加app_前缀
      const id = identifier.startsWith('app_') ? identifier : `app_${identifier}`;
      return await this.apiClient.get<GetCvmCompositionResponse>(`/api/v1/cvms/${id}/composition`, config);
    } catch (error: any) {
      // 记录错误信息
      if (error.response) {
        logger.error(`获取CVM组合信息失败: 状态码 ${error.response.status}`);
        logger.debug(`错误详情: ${JSON.stringify(error.response.data)}`);
      } else if (error.code === 'ECONNABORTED') {
        logger.error(`请求超时: 获取CVM ${identifier} 组合信息时超时`);
      } else {
        logger.error(`获取CVM组合信息失败: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 启动CVM
   * @param identifier - CVM标识符，可以是app_id或CVM的ID
   * @param timeout - 超时时间(毫秒)，默认8秒
   * @returns 启动操作响应，包含CVM的详细信息
   */
  async startCvm(identifier: string, timeout?: number): Promise<StartCvmResponse> {
    logger.debug(`启动CVM: ${identifier}`);
    
    // 使用自定义超时设置
    const config = timeout ? { timeout } : undefined;
    
    try {
      // 如果标识符不是以app_开头，则添加app_前缀
      const id = identifier.startsWith('app_') ? identifier : `app_${identifier}`;
      return await this.apiClient.post<StartCvmResponse>(`/api/v1/cvms/${id}/start`, {}, config);
    } catch (error: any) {
      // 记录错误信息
      if (error.response) {
        logger.error(`启动CVM失败: 状态码 ${error.response.status}`);
        logger.debug(`错误详情: ${JSON.stringify(error.response.data)}`);
        
        // 如果是特定的错误状态码，提供更具体的错误信息
        if (error.response.status === 400) {
          logger.error('请求格式错误，请检查参数');
        } else if (error.response.status === 404) {
          logger.error(`未找到CVM: ${identifier}`);
        } else if (error.response.status === 409) {
          logger.error('冲突：CVM可能已在运行或处于其他不允许启动的状态');
        } else if (error.response.status === 500) {
          logger.error('服务器错误，请稍后重试');
        }
      } else if (error.code === 'ECONNABORTED') {
        logger.error(`请求超时: 启动CVM ${identifier} 时超时`);
      } else {
        logger.error(`启动CVM失败: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 停止CVM
   * @param identifier - CVM标识符，可以是app_id或CVM的ID
   * @param timeout - 超时时间(毫秒)，默认8秒
   * @returns 停止操作响应，包含CVM的详细信息
   */
  async stopCvm(identifier: string, timeout?: number): Promise<StopCvmResponse> {
    logger.debug(`停止CVM: ${identifier}`);
    
    // 使用自定义超时设置
    const config = timeout ? { timeout } : undefined;
    
    try {
      // 如果标识符不是以app_开头，则添加app_前缀
      const id = identifier.startsWith('app_') ? identifier : `app_${identifier}`;
      return await this.apiClient.post<StopCvmResponse>(`/api/v1/cvms/${id}/stop`, {}, config);
    } catch (error: any) {
      // 记录错误信息
      if (error.response) {
        logger.error(`停止CVM失败: 状态码 ${error.response.status}`);
        logger.debug(`错误详情: ${JSON.stringify(error.response.data)}`);
        
        // 如果是特定的错误状态码，提供更具体的错误信息
        if (error.response.status === 400) {
          logger.error('请求格式错误，请检查参数');
        } else if (error.response.status === 404) {
          logger.error(`未找到CVM: ${identifier}`);
        } else if (error.response.status === 409) {
          logger.error('冲突：CVM可能已在运行或处于其他不允许停止的状态');
        } else if (error.response.status === 500) {
          logger.error('服务器错误，请稍后重试');
        }
      } else if (error.code === 'ECONNABORTED') {
        logger.error(`请求超时: 停止CVM ${identifier} 时超时`);
      } else {
        logger.error(`停止CVM失败: ${error.message}`);
      }
      throw error;
    }
  }
} 