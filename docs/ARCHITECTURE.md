# Aether 工程架构

## 边界与依赖方向

Aether 按照 **领域 → 应用 → 基础设施 → 展示** 的依赖方向组织。领域层只处理可预测的数据变换；应用层编排采集用例；基础设施层封装 Expo、Android 与蓝牙库；展示层只消费状态和触发应用命令。页面不能直接实现原生扫描生命周期、RSSI 推导或持久化规则。

| 层级 | 目录 | 责任 | 禁止事项 |
| --- | --- | --- | --- |
| 领域 | `lib/tracker/types.ts`、`estimation.ts`、`selectors.ts`、`location-quality.ts` | 不变量、估算、聚合、只读查询 | 不导入 React、Expo 或 AsyncStorage。 |
| 应用 | `state.ts`、`TrackingController.ts` | 状态机、权限检查、会话生命周期、错误契约 | 不直接渲染 UI 或读写平台 API。 |
| 基础设施 | `NativeTrackerService.ts`、`storage.ts`、`background-location-task.ts` | BLE、定位、传感器、前台服务与本地存储适配 | 不包含路由或 JSX。 |
| 展示 | `app/`、`components/` | 显示状态、收集用户意图、导航 | 不直接调用 BLE 或位置模块。 |

## 关键契约

`NativeTrackingPort` 是应用层与原生层之间的最小端口。`TrackingController` 仅依赖此端口，因此权限失败、原生启动失败和停止路径可用内存假实现测试。`NativeTrackerCallbacks` 是原生事件进入状态机的唯一入口。

`trackerReducer` 是所有追踪状态变化的纯函数。会话计数、全局设备摘要和删除级联必须经由 reducer 完成，禁止页面直接修改 `sessions` 或 `observations`。

## 数据不变量

| 不变量 | 说明 |
| --- | --- |
| 活动会话唯一 | 同一时刻最多一个 `activeSession`。 |
| 观测归属不可变 | 每条 `DeviceObservation` 必须有一个 `sessionId`。 |
| 会话计数一致 | 写入一条观测后，目标会话的 `observationCount` 同步递增。 |
| 位置不回填 | 观测记录的是发生当时最近的可用位置快照。 |
| 方位是估算 | RSSI 方位输出最多为中等置信度，绝不写成坐标定位。 |
