# Aether

**Aether** 是一个本地优先的 Android BLE 现场追踪学习项目。它记录周边 BLE 广播、位置、速度、手机朝向与传感器状态，并以一次扫描会话为单位浏览、导出和可视化数据。

## 从哪里开始

如果你刚开始学习移动应用，请先读 [学习指南](docs/LEARNING_GUIDE.md)。它解释目录、数据流、真机调试和建议练习。熟悉后阅读 [架构说明](docs/ARCHITECTURE.md)，再参考 [工程规范](docs/ENGINEERING.md) 运行质量门禁与编写改动。

| 文档 | 适用场景 |
| --- | --- |
| [学习指南](docs/LEARNING_GUIDE.md) | 初次阅读项目、理解 React Native 与 Android 原生能力如何结合。 |
| [学习练习](docs/LEARNING_EXERCISES.md) | 通过低风险的小功能练习测试驱动的修改流程。 |
| [架构说明](docs/ARCHITECTURE.md) | 理解领域、应用、基础设施和展示层的边界。 |
| [工程规范](docs/ENGINEERING.md) | 运行质量检查、维护测试和编写可审核改动。 |
| [MVP 真机指南](MVP_GUIDE.md) | 在 Android 开发构建上验证 BLE、定位与后台运行。 |

## 常用命令

```bash
pnpm check    # TypeScript 静态检查
pnpm test     # 领域与应用层单元测试
pnpm quality  # check + lint + test
pnpm android  # Android 开发构建
```

> 浏览器预览只能检查界面。BLE、传感器、位置和锁屏后台行为必须在 Android 真机的开发构建或发布构建中验证。
