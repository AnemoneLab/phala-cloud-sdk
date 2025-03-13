import { z } from 'zod';

/**
 * Phala Cloud SDK 配置选项
 */
export interface PhalaCloudConfig {
  /**
   * API URL for Phala Cloud
   */
  apiUrl?: string;
  
  /**
   * API Key for authentication
   */
  apiKey?: string;
}

/**
 * 环境变量对
 */
export interface Env {
  key: string;
  value: string;
}

/**
 * Docker配置
 */
export const dockerConfigSchema = z.object({
  password: z.string(),
  registry: z.string().nullable(),
  username: z.string()
});

export type DockerConfig = z.infer<typeof dockerConfigSchema>;

/**
 * 部署配置
 */
export interface DeployOptions {
  type: string;
  mode: string;
  name: string;
  compose: string;
  env?: string[];
  envFile?: string;
  debug?: boolean;
  envs?: Env[];
  /**
   * 虚拟CPU数量
   * @default 1
   */
  vcpu?: number;
  /**
   * 内存大小 (MB)
   * @default 2048
   */
  memory?: number;
  /**
   * 磁盘大小 (GB)
   * @default 20
   */
  diskSize?: number;
  /**
   * Teepod ID
   * 如果未指定，SDK将自动查找可用的teepod
   */
  teepodId?: number;
  /**
   * 容器镜像名称
   * @default "dstack-dev-0.3.4"
   */
  image?: string;
}

/**
 * 升级配置
 */
export interface UpgradeOptions {
  name: string;
  compose: string;
  env?: string[];
  envFile?: string;
  debug?: boolean;
  envs?: Env[];
}

/**
 * CVM 实例信息
 */
export const hostedSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),
  uptime: z.string(),
  app_url: z.string(),
  app_id: z.string(),
  instance_id: z.string(),
  configuration: z.any(),
  exited_at: z.string(),
  boot_progress: z.string(),
  boot_error: z.string(),
  shutdown_progress: z.string(),
  image_version: z.string()
});

export type Hosted = z.infer<typeof hostedSchema>;

/**
 * 用户信息
 */
export const managedUserSchema = z.object({
  id: z.number(),
  username: z.string()
});

export type ManagedUser = z.infer<typeof managedUserSchema>;

/**
 * 节点信息
 */
export const nodeSchema = z.object({
  id: z.number(),
  name: z.string()
});

export type Node = z.infer<typeof nodeSchema>;

/**
 * CVM 实例详细信息
 */
export const cvmInstanceSchema = z.object({
  hosted: hostedSchema,
  name: z.string(),
  managed_user: managedUserSchema,
  node: nodeSchema,
  listed: z.boolean(),
  status: z.string(),
  in_progress: z.boolean(),
  dapp_dashboard_url: z.string(),
  syslog_endpoint: z.string(),
  allow_upgrade: z.boolean()
});

export type CvmInstance = z.infer<typeof cvmInstanceSchema>;

/**
 * 创建 CVM 响应
 */
export const createCvmResponseSchema = z.object({
  app_id: z.string(),
  app_url: z.string()
});

export type CreateCvmResponse = z.infer<typeof createCvmResponseSchema>;

/**
 * 获取 CVM 公钥响应
 */
export const getPubkeyFromCvmResponseSchema = z.object({
  app_env_encrypt_pubkey: z.string(),
  app_id_salt: z.string()
});

export type GetPubkeyFromCvmResponse = z.infer<typeof getPubkeyFromCvmResponseSchema>;

/**
 * 获取 CVM 信息响应
 */
export const getCvmByAppIdResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  app_id: z.string(),
  app_url: z.string(),
  encrypted_env_pubkey: z.string(),
  status: z.string(),
  instance_id: z.string().optional()
});

export type GetCvmByAppIdResponse = z.infer<typeof getCvmByAppIdResponseSchema>;

/**
 * 获取用户信息响应
 */
export const getUserInfoResponseSchema = z.object({
  id: z.string(),
  username: z.string()
});

export type GetUserInfoResponse = z.infer<typeof getUserInfoResponseSchema>;

/**
 * 获取用户的 CVMs 列表响应
 */
export const getCvmsByUserIdResponseSchema = z.array(cvmInstanceSchema);

export type GetCvmsByUserIdResponse = z.infer<typeof getCvmsByUserIdResponseSchema>;

/**
 * 升级 CVM 响应
 */
export const upgradeCvmResponseSchema = z.object({
  detail: z.string()
});

export type UpgradeCvmResponse = z.infer<typeof upgradeCvmResponseSchema>;

/**
 * CVM证明响应接口
 */
export interface GetCvmAttestationResponse {
  /**
   * CVM是否在线
   */
  is_online: boolean;
  
  /**
   * CVM是否公开
   */
  is_public: boolean;
  
  /**
   * 错误信息，如果有的话
   */
  error: string | null;
  
  /**
   * 应用证书列表
   */
  app_certificates: Array<{
    /**
     * 证书主题
     */
    subject: {
      common_name: string;
      organization: string | null;
      country: string | null;
      state: string | null;
      locality: string | null;
    };
    
    /**
     * 证书发行者
     */
    issuer: {
      common_name: string;
      organization: string;
      country: string | null;
    };
    
    /**
     * 证书序列号
     */
    serial_number: string;
    
    /**
     * 证书有效期开始时间
     */
    not_before: string;
    
    /**
     * 证书有效期结束时间
     */
    not_after: string;
    
    /**
     * 证书版本
     */
    version: string;
    
    /**
     * 证书指纹
     */
    fingerprint: string;
    
    /**
     * 签名算法
     */
    signature_algorithm: string;
    
    /**
     * 主题备用名称
     */
    sans: any | null;
    
    /**
     * 是否为CA证书
     */
    is_ca: boolean;
    
    /**
     * 在证书链中的位置
     */
    position_in_chain: number;
    
    /**
     * 引用值(quote)，用于远程认证
     */
    quote: string | null;
  }>;
  
  /**
   * TCB (Trusted Computing Base) 信息
   */
  tcb_info: {
    /**
     * Measured Root of Trust for Data
     */
    mrtd: string;
    
    /**
     * 根文件系统哈希
     */
    rootfs_hash: string;
    
    /**
     * Runtime Measurement Register 0
     */
    rtmr0: string;
    
    /**
     * Runtime Measurement Register 1
     */
    rtmr1: string;
    
    /**
     * Runtime Measurement Register 2
     */
    rtmr2: string;
    
    /**
     * Runtime Measurement Register 3
     */
    rtmr3: string;
    
    /**
     * 事件日志
     */
    event_log: Array<{
      /**
       * 测量寄存器索引
       */
      imr: number;
      
      /**
       * 事件类型
       */
      event_type: number;
      
      /**
       * 摘要值
       */
      digest: string;
      
      /**
       * 事件名称
       */
      event: string;
      
      /**
       * 事件负载数据
       */
      event_payload: string;
    }>;
  };
  
  /**
   * Docker Compose文件内容
   */
  compose_file: string;
} 