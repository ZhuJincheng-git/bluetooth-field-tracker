const { createRunOncePlugin, withAndroidManifest } = require("@expo/config-plugins");

const SERVICE_NAME = "com.asterinet.react.bgactions.RNBackgroundActionsTask";
const REQUIRED_PERMISSIONS = [
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.FOREGROUND_SERVICE_LOCATION",
  "android.permission.FOREGROUND_SERVICE_CONNECTED_DEVICE",
  "android.permission.ACCESS_COARSE_LOCATION",
  "android.permission.ACCESS_FINE_LOCATION",
];

function withTrackerForegroundService(config) {
  return withAndroidManifest(config, (configured) => {
    const manifest = configured.modResults.manifest;
    manifest["uses-permission"] ??= [];

    for (const permission of REQUIRED_PERMISSIONS) {
      const exists = manifest["uses-permission"].some((entry) => entry.$?.["android:name"] === permission);
      if (!exists) manifest["uses-permission"].push({ $: { "android:name": permission } });
    }

    const application = manifest.application?.[0];
    if (!application) return configured;
    application.service ??= [];

    const service = application.service.find((entry) => entry.$?.["android:name"] === SERVICE_NAME);
    const foregroundAttributes = {
      "android:name": SERVICE_NAME,
      "android:exported": "false",
      "android:foregroundServiceType": "location|connectedDevice",
    };

    if (service) {
      service.$ = { ...service.$, ...foregroundAttributes };
    } else {
      application.service.push({ $: foregroundAttributes });
    }

    return configured;
  });
}

module.exports = createRunOncePlugin(withTrackerForegroundService, "with-tracker-foreground-service", "1.0.0");
