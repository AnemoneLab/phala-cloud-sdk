/**
 * 简单的日志记录器
 */
class Logger {
  private readonly _debugMode: boolean;

  constructor() {
    // 从环境变量中获取调试模式设置
    this._debugMode = process.env.PHALA_SDK_DEBUG === 'true';
  }

  /**
   * 记录调试信息，仅在调试模式下显示
   * @param message 消息
   * @param optionalParams 附加参数
   */
  debug(message: string, ...optionalParams: any[]) {
    if (this._debugMode) {
      console.debug(`[Phala SDK DEBUG] ${message}`, ...optionalParams);
    }
  }

  /**
   * 记录信息
   * @param message 消息
   * @param optionalParams 附加参数
   */
  info(message: string, ...optionalParams: any[]) {
    console.info(`[Phala SDK] ${message}`, ...optionalParams);
  }

  /**
   * 记录警告
   * @param message 消息
   * @param optionalParams 附加参数
   */
  warn(message: string, ...optionalParams: any[]) {
    console.warn(`[Phala SDK WARNING] ${message}`, ...optionalParams);
  }

  /**
   * 记录错误
   * @param message 消息
   * @param optionalParams 附加参数
   */
  error(message: string, ...optionalParams: any[]) {
    console.error(`[Phala SDK ERROR] ${message}`, ...optionalParams);
  }

  /**
   * 检查是否处于调试模式
   * @returns 是否处于调试模式
   */
  get isDebugMode(): boolean {
    return this._debugMode;
  }
}

export const logger = new Logger(); 