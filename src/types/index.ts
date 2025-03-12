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