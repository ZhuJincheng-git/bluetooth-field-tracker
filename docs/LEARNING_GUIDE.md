# Aether 项目学习指南

## 这是什么项目

Aether 是一个 **Android BLE 现场追踪器**。它把周边设备广播、手机位置、GPS 速度、手机朝向和运动传感器读数写入同一条观察记录；用户可以按一次扫描会话浏览、导出和复盘这些记录。这个项目特别适合已经会阅读 TypeScript、但还没有做过移动应用的学习者。

> **先建立正确预期。** BLE 的 RSSI 容易受人体、墙体、天线方向和反射影响。项目展示的是带置信度的趋势或扇区估算，而不是精确设备坐标。Android 对锁屏、Doze 和厂商省电策略也会限制后台工作。[1] [2]

## 先运行什么

| 目标 | 命令或方式 | 你将学到什么 |
| --- | --- | --- |
| 检查类型 | `pnpm check` | TypeScript 如何保护接口契约。 |
| 运行质量门禁 | `pnpm quality` | 静态检查、Lint 与测试如何共同防回归。 |
| 运行 Android | `pnpm android` | 为什么 BLE、传感器和后台能力必须在开发构建或发布构建测试。 |
| 查看 Web 布局 | `pnpm dev` | Web 预览只验证 UI，不能验证手机 BLE/定位。 |

Android 原生能力不能通过 Expo Go 或浏览器完整验证；BLE 原生库与后台定位都需要包含原生模块的构建。[3] [4]

## 推荐阅读路线

请按下面的顺序阅读，而不要一开始就钻进 `NativeTrackerService.ts`。每一层只依赖其下方的稳定契约，这能降低新手理解移动应用时的心智负担。

| 顺序 | 文件 | 学习重点 |
| --- | --- | --- |
| 1 | `lib/tracker/types.ts` | 项目有哪些“名词”：会话、观测、位置、运动、偏好。 |
| 2 | `lib/tracker/selectors.ts` 与 `estimation.ts` | 如何把原始数据变成设备摘要和保守估算。 |
| 3 | `lib/tracker/state.ts` | Reducer 如何把用户操作和传感器事件变成下一份状态。 |
| 4 | `lib/tracker/ports.ts` 与 `TrackingController.ts` | 如何把业务流程与 Android 原生实现隔离。 |
| 5 | `lib/tracker/NativeTrackerService.ts` | 如何订阅 BLE、位置、罗盘和运动传感器。 |
| 6 | `lib/tracker/TrackerProvider.tsx` | React 如何把状态机、持久化和原生回调接到界面。 |
| 7 | `app/(tabs)/index.tsx` | 页面如何只显示状态并调用控制器。 |
| 8 | `tests/` | 如何用假原生端口验证失败路径，而不依赖手机。 |

## 一次扫描的数据流

下面是点击“开始采集”后发生的完整路径。建议一边阅读代码，一边顺着编号搜索对应函数。

1. `ScanScreen` 调用 `trackingController.start(...)`，页面不直接调用蓝牙库。
2. `TrackingController` 请求权限，检查权限结果，再创建会话。
3. `NativeTrackerService` 启动 BLE、位置、磁力计与加速度订阅，并把事件通过 `NativeTrackerCallbacks` 推回应用层。
4. `TrackerProvider` 给每条原始观测补充 `id` 和当前 `sessionId`，然后把 action 分派给 `trackerReducer`。
5. `trackerReducer` 保持会话计数、全局观察列表和设备摘要一致。
6. `AsyncStorage` 保存稳定的数据；重新打开应用后，Provider 通过 `hydrate` 恢复这些数据。
7. `selectors.ts` 按会话或设备汇总数据，详情页和可视化组件只读取这些派生结果。

> **为什么不在页面里直接写蓝牙逻辑？** 因为页面会频繁重渲染，而原生扫描是一段需要可靠启动、停止与错误恢复的长生命周期任务。把它放在控制器与基础设施层，才容易测试、替换和排错。

## 最重要的三个概念

### 1. 领域模型

`types.ts` 中的接口描述事实而非 UI。`ScanSession` 是一次用户主动开始的扫描；`DeviceObservation` 是某设备在某一时刻的一次观察；`LocationSnapshot` 和 `MotionSnapshot` 记录观察发生时最近的手机状态。把这些数据建模清楚后，导出、图表和设备详情才能复用同一份事实来源。

### 2. Reducer 与不可变状态

Reducer 是一个纯函数：输入旧状态和 action，输出新状态。它不写文件、不调用蓝牙、不显示弹窗。这使得 `tracker.state.test.ts` 可以在几毫秒内验证“写入一条观测后会话计数也递增”“删除会话不会删掉别的会话”。

### 3. 端口与适配器

`NativeTrackingPort` 是应用层需要的最小能力：申请权限、开始、停止、更新运行期偏好。`NativeTrackerService` 是 Android/Expo 的具体适配器。控制器只认识接口，因此测试可以传入内存假实现，模拟“用户拒绝权限”“蓝牙启动失败”等情况，而不需要连接手机。

## 真机调试清单

| 现象 | 先检查什么 | 相关代码 |
| --- | --- | --- |
| 无设备 | 手机蓝牙、附近设备权限、RSSI 过滤阈值 | `NativeTrackerService.ts`、设置页 |
| 无经纬度 | 系统定位服务、精确位置权限、精度阈值 | `location-quality.ts` |
| 速度为空 | GPS 尚未提供速度且坐标未移动至少 1 m | `NativeTrackerService.ts` |
| 锁屏后观测有空档 | 前台服务通知、系统电池优化、厂商后台限制 | `NativeTrackerService.ts`、`MVP_GUIDE.md` |
| 方位不可信 | 缓慢转动手机收集更多扇区样本，注意遮挡 | `estimation.ts` |

Android 的后台 BLE 行为由系统策略和设备制造商策略共同影响。若做锁屏测试，请记录屏幕常亮、锁屏、锁屏加省电模式三种情况下的最后一次观测时间；不要只凭屏幕上的列表是否刷新判断扫描是否停止。[1] [2]

## 建议练习

首先为 `selectors.ts` 增加一个“某会话的平均 RSSI”纯函数和测试。接着在会话详情页显示它。完成后，再尝试给 `TrackerPreferences` 增加一个只影响显示层的偏好，并观察它为什么可以即时生效。最后可以为 `NativeTrackingPort` 的失败场景补一条控制器测试，理解端口带来的可测试性。

## 参考资料

[1] [Android Developers：BLE 后台通信](https://developer.android.com/develop/connectivity/bluetooth/ble/background)

[2] [Android Developers：前台服务概览](https://developer.android.com/develop/background-work/services/foreground-services)

[3] [react-native-ble-plx：Expo 集成说明](https://github.com/dotintent/react-native-ble-plx#expo-sdk-43)

[4] [Expo Location 文档](https://docs.expo.dev/versions/latest/sdk/location/)
