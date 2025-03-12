import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { logger } from '../utils/logger';
import { DEFAULT_CLOUD_API_URL, SDK_VERSION } from './constants';

// 扩展Axios的InternalAxiosRequestConfig接口以支持metadata
declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    metadata?: {
      startTime: number;
    };
  }
}

/**
 * API 客户端类，用于与 Phala Cloud API 进行通信
 */
export class ApiClient {
  private readonly apiUrl: string;
  private readonly apiKey?: string;
  private readonly axiosInstance: AxiosInstance;

  /**
   * 构造函数
   * @param apiUrl - Phala Cloud API URL
   * @param apiKey - Phala Cloud API Key
   * @param timeout - 请求超时时间(毫秒)，默认30秒
   * @param maxRetries - 最大重试次数，默认2次
   */
  constructor(
    apiUrl: string = DEFAULT_CLOUD_API_URL, 
    apiKey?: string, 
    timeout: number = 30000,
    private readonly maxRetries: number = 2
  ) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;

    // 创建 axios 实例
    this.axiosInstance = axios.create({
      baseURL: this.apiUrl,
      timeout: timeout, // 设置超时时间为30秒
      headers: {
        'User-Agent': `phala-cloud-sdk/${SDK_VERSION}`,
        'Content-Type': 'application/json',
      },
    });

    // 请求拦截器
    this.axiosInstance.interceptors.request.use((config) => {
      // 如果提供了API Key，添加到请求头
      if (this.apiKey) {
        config.headers['X-API-Key'] = this.apiKey;
      }
      
      // 添加请求开始时间戳，用于记录请求耗时
      config.metadata = { startTime: new Date().getTime() };
      
      return config;
    });

    // 响应拦截器
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // 计算请求耗时
        const endTime = new Date().getTime();
        const startTime = response.config.metadata?.startTime || endTime;
        const duration = endTime - startTime;
        
        logger.debug(`API请求成功: ${response.config.url} (${duration}ms)`);
        return response;
      },
      (error: any) => {
        // 计算请求耗时，即使失败也记录
        const endTime = new Date().getTime();
        const startTime = error.config?.metadata?.startTime || endTime;
        const duration = endTime - startTime;
        
        logger.error(`API请求失败: ${error.config?.url} (${duration}ms) - ${error.message}`);
        
        if (error.response) {
          const status = error.response.status;
          const data = error.response.data;
          
          logger.debug(`状态码: ${status}, 错误响应:`, data);
          
          // 添加更具体的错误信息
          if (status === 401 || status === 403) {
            logger.error('认证失败: 请检查您的API密钥是否有效');
          } else if (status === 404) {
            logger.error('请求的资源不存在: 请检查API端点是否正确');
          } else if (status === 422) {
            logger.error('请求参数验证失败: 请求包含无效数据');
            if (data && data.detail) {
              if (Array.isArray(data.detail)) {
                data.detail.forEach((item: any) => logger.error(`- ${item.loc.join('.')}: ${item.msg}`));
              } else {
                logger.error(`详细错误: ${JSON.stringify(data.detail)}`);
              }
            }
          } else if (status >= 500) {
            logger.error('服务器错误: 请稍后再试');
          }
        } else if (error.request) {
          logger.error('无响应: 服务器没有响应，请检查网络连接或稍后重试');
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * 执行带有重试机制的请求
   * @param reqFunction - 执行请求的函数
   * @returns 响应数据
   * @private
   */
  private async executeWithRetry<T>(reqFunction: () => Promise<AxiosResponse<T>>): Promise<T> {
    let lastError: any;
    let retryCount = 0;
    
    while (retryCount <= this.maxRetries) {
      try {
        if (retryCount > 0) {
          // 非首次请求，添加延迟，避免立即重试
          const delay = Math.pow(2, retryCount) * 1000; // 指数退避策略：1s, 2s, 4s...
          logger.debug(`重试请求 (${retryCount}/${this.maxRetries})，延迟 ${delay}ms 后执行...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        const response = await reqFunction();
        return response.data;
      } catch (err: any) {
        lastError = err;
        
        // 只有在网络错误或服务器错误(5xx)时才重试
        const shouldRetry = 
          !err.response || // 网络错误
          (err.response && err.response.status >= 500); // 服务器错误
          
        if (shouldRetry && retryCount < this.maxRetries) {
          retryCount++;
          logger.debug(`请求失败，准备重试 (${retryCount}/${this.maxRetries})...`);
        } else {
          break;
        }
      }
    }
    
    throw lastError;
  }

  /**
   * 发送GET请求
   * @param path - API路径
   * @param config - Axios配置
   * @returns Promise with response
   */
  async get<T = any>(path: string, config?: AxiosRequestConfig): Promise<T> {
    // CVM状态查询使用更短的超时时间
    const defaultTimeout = path.includes('/api/v1/cvms/app_') ? 15000 : 30000;
    const mergedConfig = {
      ...config,
      timeout: config?.timeout || defaultTimeout
    };
    
    return this.executeWithRetry<T>(() => this.axiosInstance.get<T>(path, mergedConfig));
  }

  /**
   * 发送POST请求
   * @param path - API路径
   * @param data - 请求数据
   * @param config - Axios配置
   * @returns Promise with response
   */
  async post<T = any>(path: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    // 部署和升级操作可能需要更长的超时时间
    const defaultTimeout = 
      path.includes('/api/v1/cvms/from_cvm_configuration') || // 部署
      path.includes('/compose') ? // 升级
      60000 : 30000;
      
    const mergedConfig = {
      ...config,
      timeout: config?.timeout || defaultTimeout
    };
    
    return this.executeWithRetry<T>(() => this.axiosInstance.post<T>(path, data, mergedConfig));
  }

  /**
   * 发送PUT请求
   * @param path - API路径
   * @param data - 请求数据
   * @param config - Axios配置
   * @returns Promise with response
   */
  async put<T = any>(path: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.executeWithRetry<T>(() => this.axiosInstance.put<T>(path, data, config));
  }

  /**
   * 发送DELETE请求
   * @param path - API路径
   * @param config - Axios配置
   * @returns Promise with response
   */
  async delete<T = any>(path: string, config?: AxiosRequestConfig): Promise<T> {
    return this.executeWithRetry<T>(() => this.axiosInstance.delete<T>(path, config));
  }
} 