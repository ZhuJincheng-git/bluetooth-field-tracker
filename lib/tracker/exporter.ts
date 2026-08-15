import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import { createSessionExport, createTrackerExport } from "@/lib/tracker/export-schema";
import type { DeviceObservation, ScanSession } from "@/lib/tracker/types";

export { createTrackerExport } from "@/lib/tracker/export-schema";

async function shareExport(payload: ReturnType<typeof createTrackerExport>, fileName: string): Promise<{ fileName: string; uri: string }> {
  const serialized = JSON.stringify(payload, null, 2);

  if (Platform.OS === "web") {
    throw new Error("浏览器预览无法分享本地文件。请在 Android 开发构建或发布构建中导出 JSON。 ");
  }
  if (!FileSystem.documentDirectory) {
    throw new Error("设备文档目录不可用，无法创建导出文件。");
  }

  const uri = `${FileSystem.documentDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, serialized, { encoding: FileSystem.EncodingType.UTF8 });
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("此设备未提供系统分享面板，导出文件已写入应用文档目录。");
  }
  await Sharing.shareAsync(uri, { dialogTitle: "导出扫描记录", mimeType: "application/json" });
  return { fileName, uri };
}

export async function exportTrackerData(sessions: ScanSession[], observations: DeviceObservation[]): Promise<{ fileName: string; uri: string }> {
  const payload = createTrackerExport(sessions, observations);
  const fileName = `bluetooth-field-tracker-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  return shareExport(payload, fileName);
}

export async function exportSessionData(session: ScanSession, observations: DeviceObservation[]): Promise<{ fileName: string; uri: string }> {
  const payload = createSessionExport(session, observations);
  const fileName = `bluetooth-scan-${new Date(session.startedAt).toISOString().replace(/[:.]/g, "-")}.json`;
  return shareExport(payload, fileName);
}
