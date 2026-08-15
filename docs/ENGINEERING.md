# Aether 开发与质量规范

## 质量门禁

每次功能变更至少通过 `pnpm check` 与 `pnpm test`。合并前运行 `pnpm quality`，它会执行 TypeScript、ESLint 与全部 Vitest 用例。原生 BLE、锁屏前台服务和后台定位不可由 Web 预览替代，必须在 Android 开发构建上完成验收。

| 命令 | 用途 |
| --- | --- |
| `pnpm check` | TypeScript 静态检查。 |
| `pnpm lint` | Expo/ESLint 规则检查。 |
| `pnpm test` | 确定性领域与应用层单元测试。 |
| `pnpm quality` | 合并前完整质量门禁。 |
| `pnpm android` | 启动 Android 开发构建进行原生能力验证。 |

## 新功能工作流

新增领域规则时，先在 `lib/tracker/` 写纯函数与测试，再由 reducer 或 controller 接入。新增原生能力时，先扩展 `ports.ts` 的端口契约，再实现 `NativeTrackerService`；页面只通过 `TrackingController` 发起用例。新增持久化字段时，必须使用默认值兼容旧记录，并在导出 schema 中维持版本化说明。

## 注释与错误约定

注释解释**为什么**存在某个约束，而不是复述代码。面向用户的错误消息由应用层产生并且可执行；原生服务保留底层错误语义。任何不能保证准确性的蓝牙距离或方位数据必须附带置信度和限制说明。
