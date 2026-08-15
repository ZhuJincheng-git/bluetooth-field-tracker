import type { NativeTrackerCallbacks, NativeTrackingPort } from "./ports";
import type { DeviceObservation, LocationQuality, LocationSnapshot, MotionSnapshot, PermissionStatus, ScanLifecycle, ScanSession, TrackerPreferences } from "./types";

export interface TrackerCommandPort {
  startSession: () => ScanSession;
  stopSession: () => void;
  setLifecycle: (lifecycle: ScanLifecycle, error?: string | null) => void;
  setPermissions: (permissions: Partial<PermissionStatus>) => void;
  setLatestLocation: (location: LocationSnapshot | null) => void;
  setLocationQuality: (quality: LocationQuality) => void;
  setLatestMotion: (motion: MotionSnapshot | null) => void;
  recordObservation: (observation: Omit<DeviceObservation, "id" | "sessionId">) => void;
}

function permissionError(permissions: PermissionStatus, requestBackgroundTracking: boolean): string | null {
  // 把权限判断抽成纯函数，保证 UI、测试和控制流程使用同一套规则。
  if (permissions.bluetooth !== "granted" || permissions.locationForeground !== "granted") {
    return "需要蓝牙扫描和精确位置权限才能创建采集记录。请在系统设置中允许后重试。";
  }
  if (requestBackgroundTracking && permissions.locationBackground !== "granted") {
    return "后台采集需要“始终允许”位置权限。请在系统设置完成授权，或在设置中关闭后台采集后重试。";
  }
  return null;
}

/**
 * 应用层的采集用例。它将权限、会话与原生服务编排从页面组件中移出，
 * 并只依赖可替换端口，因此可在单元测试内使用内存假实现验证失败路径。
 */
export class TrackingController {
  constructor(private readonly native: NativeTrackingPort) {}

  async start(preferences: TrackerPreferences, commands: TrackerCommandPort): Promise<void> {
    // 先进入 starting，页面即可在原生权限弹窗期间显示确定的状态。
    commands.setLifecycle("starting");
    let sessionStarted = false;
    try {
      const permissions = await this.native.requestRequiredPermissions(preferences.requestBackgroundTracking);
      commands.setPermissions(permissions);
      const error = permissionError(permissions, preferences.requestBackgroundTracking);
      if (error) throw new Error(error);

      commands.startSession();
      sessionStarted = true;
      // 从这里开始，原生服务只通过 callbacks 传递数据，不直接认识 React state。
      await this.native.start(preferences, {
        onLocation: commands.setLatestLocation,
        onLocationQuality: commands.setLocationQuality,
        onMotion: commands.setLatestMotion,
        onObservation: commands.recordObservation,
      });
    } catch (error) {
      // “补偿操作”很重要：原生启动只要失败，就撤销刚才创建的空会话。
      await this.native.stop();
      if (sessionStarted) commands.stopSession();
      commands.setLifecycle("error", error instanceof Error ? error.message : "无法开始采集。");
    }
  }

  async stop(commands: TrackerCommandPort): Promise<void> {
    // 停止操作同样走控制器，避免页面忘记停止某一个传感器订阅。
    commands.setLifecycle("stopping");
    try {
      await this.native.stop();
      commands.stopSession();
    } catch (error) {
      commands.setLifecycle("error", error instanceof Error ? error.message : "无法停止采集。");
    }
  }

  applyRuntimePreferences(preferences: TrackerPreferences): void {
    this.native.updatePreferences(preferences);
  }
}
