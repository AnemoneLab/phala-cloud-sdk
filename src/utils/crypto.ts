import { x25519 } from '@noble/curves/ed25519';
import { logger } from './logger';

/**
 * 将16进制字符串转换为Uint8Array
 * @param hex 16进制字符串
 * @returns Uint8Array
 */
export function hexToUint8Array(hex: string): Uint8Array {
  if (hex.startsWith('0x')) {
    hex = hex.substring(2);
  }
  if (hex.length % 2 !== 0) {
    throw new Error('不是有效的16进制字符串');
  }
  const array = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    array[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return array;
}

/**
 * 将Uint8Array转换为16进制字符串
 * @param bytes Uint8Array
 * @returns 16进制字符串
 */
export function uint8ArrayToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * 加密环境变量
 * @param envs 环境变量数组
 * @param pubkey 加密公钥
 * @returns 加密后的字符串
 */
export async function encryptSecrets(envs: { key: string; value: string }[], pubkey: string): Promise<string> {
  try {
    logger.debug('Encrypting environment variables...');
    
    // 将环境变量转换为JSON
    const envsJson = JSON.stringify({ env: envs });
    logger.debug(`Environment variables JSON: ${envsJson}`);

    // 生成随机私钥并导出公钥
    const privateKey = x25519.utils.randomPrivateKey();
    const publicKey = x25519.getPublicKey(privateKey);

    // 解析远程公钥
    const remotePubkey = hexToUint8Array(pubkey);
    
    // 生成共享密钥
    const shared = x25519.getSharedSecret(privateKey, remotePubkey);

    // 为AES-GCM导入共享密钥
    const importedShared = await crypto.subtle.importKey(
      'raw',
      shared,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt']
    );

    // 加密数据
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      importedShared,
      new TextEncoder().encode(envsJson)
    );

    // 组合所有组件
    const result = new Uint8Array(publicKey.length + iv.length + encrypted.byteLength);
    result.set(publicKey);
    result.set(iv, publicKey.length);
    result.set(new Uint8Array(encrypted), publicKey.length + iv.length);

    return uint8ArrayToHex(result);
  } catch (error) {
    logger.error('Error encrypting secrets:', error);
    throw new Error(`加密环境变量失败: ${error.message}`);
  }
} 