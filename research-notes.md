# 技术调研记录

## 2026-08-15：Android 后台 BLE 与 Expo 方案评估

Android 官方建议后台发现设备时采用不会无谓周期唤醒应用的机制；其 BLE 后台通信指南明确指出，定期扫描以寻找设备会降低效率。应用若需在后台持续采集，应由用户可见的前台服务承载，并接受设备厂商、省电策略和 Android 版本造成的限制。Android 端的定位采集也必须采用同样清晰的用户可见运行状态与权限解释。

当前 Expo 模板不包含 BLE 模块；MVP 将使用原生 BLE 库和 Expo 预构建配置，而不依赖 Expo Go。`react-native-ble-plx` 文档说明 Expo 项目需要配置原生插件，并提供 `BleManager.startDeviceScan` 与 `stopDeviceScan` API。该库能覆盖前台扫描；Android 的连续后台扫描需要额外的原生前台服务桥接，因此本 MVP 会将其封装为可替换的 Android 适配层，并在真机构建中验证。

| 结论 | MVP 决策 |
| --- | --- |
| 后台扫描并非云端任务 | 不创建服务器轮询或常驻后端；采集在用户 Android 设备上执行。 |
| Expo Go 无法加载自定义 BLE 原生模块 | 使用开发构建或发布构建进行 Android 真机测试。 |
| RSSI 无法直接得出准确方位或距离 | 仅显示基于趋势与轨迹的估算及置信度，默认“未知”。 |
| 后台运行影响电量且受系统限制 | 使用前台服务通知、采集节流与透明提示；用户可随时停止。 |

## 参考

1. [Android Developers: Communicate in the background](https://developer.android.com/develop/connectivity/bluetooth/ble/background)
2. [react-native-ble-plx 3.3.0 documentation](https://dotintent.github.io/react-native-ble-plx/)
3. [react-native-background-actions package documentation](https://www.npmjs.com/package/react-native-background-actions)

## 2026-08-15：MVP 原生验证

项目已执行 Android 预构建。生成的主清单包含 BLE 扫描、后台位置、通知、`FOREGROUND_SERVICE_LOCATION` 和 `FOREGROUND_SERVICE_CONNECTED_DEVICE` 权限；前台服务声明为 `location|connectedDevice`。这验证了 Expo 配置、BLE 插件、位置插件、通知插件与本地服务配置插件可以共同生成 Android 原生工程。

## 2026-08-15：真机扫描诊断与改造方案

用户提供的单次扫描导出包含 437 条 BLE 观测。其中 145 条发生在首个位置快照到达之前，因此没有位置关联；其余 292 条均复用了同一个位置快照，字段为约 60 米精度、`speedMps: 0` 和 `headingDegrees: 0`。这证明 BLE 扫描本身正常，但原实现只以“10 秒或移动 10 米”的位置订阅作为运动来源，既没有在启动时主动获取可用位置，也没有单独订阅罗盘，因而无法产生连续的速度与手机朝向。

本轮改造将先读取最后已知位置并立即请求一次平衡精度位置，再以更短的前台订阅间隔持续更新位置。运动方向将优先来自位置的行进方向；若位置航向不可用或设备静止，则使用经过平滑的手机罗盘航向作为设备朝向，同时把两者明确区分。BLE 观测将记录当时的位置、行进航向、手机罗盘航向、速度、运动强度与 RSSI。

相对方位不会宣称精确定位。对同一设备，仅在手机已旋转覆盖足够角度、存在足够 RSSI 变化且采样数量达标时，系统才根据“最强平滑 RSSI 对应的手机朝向”推导粗略绝对方位，并相对当前手机朝向显示左前、前方、右侧等扇区；否则继续显示“采样不足”。此方法对于人体遮挡、多径反射和设备天线方向敏感，始终限制为低至中等置信度。
