import { describe, expect, it, vi } from "vitest";

import { TrackingController, type TrackerCommandPort } from "../lib/tracker/TrackingController";
import type { NativeTrackingPort } from "../lib/tracker/ports";
import { DEFAULT_TRACKER_PREFERENCES, type PermissionStatus } from "../lib/tracker/types";
import { createSession } from "./helpers/tracker-fixtures";

function grantedPermissions(): PermissionStatus {
  return { bluetooth: "granted", locationForeground: "granted", locationBackground: "granted", notifications: "granted" };
}

function commands(): TrackerCommandPort {
  return {
    startSession: vi.fn(() => createSession()),
    stopSession: vi.fn(),
    setLifecycle: vi.fn(),
    setPermissions: vi.fn(),
    setLatestLocation: vi.fn(),
    setLocationQuality: vi.fn(),
    setLatestMotion: vi.fn(),
    recordObservation: vi.fn(),
  };
}

function native(overrides: Partial<NativeTrackingPort> = {}): NativeTrackingPort {
  // 这不是 mock 某个实现细节，而是一个实现了端口契约的“假 Android 层”。
  // 因此控制器测试不需要蓝牙硬件或 React Native 运行时。
  return {
    requestRequiredPermissions: vi.fn(async () => grantedPermissions()),
    start: vi.fn(async () => undefined),
    stop: vi.fn(async () => undefined),
    updatePreferences: vi.fn(),
    ...overrides,
  };
}

describe("TrackingController", () => {
  it("does not create a session when required permissions are denied", async () => {
    const deniedPermissions: PermissionStatus = { ...grantedPermissions(), bluetooth: "denied" };
    const port = native({ requestRequiredPermissions: vi.fn(async (): Promise<PermissionStatus> => deniedPermissions) });
    const commandPort = commands();

    await new TrackingController(port).start(DEFAULT_TRACKER_PREFERENCES, commandPort);

    expect(commandPort.startSession).not.toHaveBeenCalled();
    expect(port.start).not.toHaveBeenCalled();
    expect(commandPort.setLifecycle).toHaveBeenLastCalledWith("error", expect.stringContaining("蓝牙扫描"));
  });

  it("starts a session only after permissions pass and delegates callbacks to the command port", async () => {
    const port = native();
    const commandPort = commands();

    await new TrackingController(port).start(DEFAULT_TRACKER_PREFERENCES, commandPort);

    expect(commandPort.startSession).toHaveBeenCalledOnce();
    expect(port.start).toHaveBeenCalledOnce();
    expect(commandPort.setPermissions).toHaveBeenCalledWith(grantedPermissions());
  });

  it("always returns the state machine to an error state if native startup fails", async () => {
    const port = native({ start: vi.fn(async () => { throw new Error("adapter unavailable"); }) });
    const commandPort = commands();

    await new TrackingController(port).start(DEFAULT_TRACKER_PREFERENCES, commandPort);

    expect(port.stop).toHaveBeenCalledOnce();
    expect(commandPort.stopSession).toHaveBeenCalledOnce();
    expect(commandPort.setLifecycle).toHaveBeenLastCalledWith("error", "adapter unavailable");
  });
});
