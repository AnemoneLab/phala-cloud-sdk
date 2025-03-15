# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0]

### Added
- 新增 `updateCompose` 方法，用于更新CVM的Docker Compose配置
- 新增 `getCvmStats` 方法，用于获取CVM的系统状态信息（CPU、内存、磁盘等）
- 新增 `getCvmComposition` 方法，用于获取CVM的组合信息（Docker Compose配置和容器运行状态）
- 新增 `startCvm` 方法，用于启动已停止的CVM
- 新增 `stopCvm` 方法，用于停止正在运行的CVM
- 新增相关接口类型定义，支持完整的类型提示

## [0.1.2]

### Added
- 新增 `getCvmAttestation` 方法，用于获取CVM的证明(attestation)信息
- 新增 `GetCvmAttestationResponse` 类型接口，支持完整的类型提示

## [0.1.1]

### Added
- 初始版本发布
- 支持CVM部署和管理功能
- 提供基本的Phala Cloud API交互能力 