declare module "react-native-background-actions" {
  interface BackgroundServiceOptions {
    taskName: string;
    taskTitle: string;
    taskDesc: string;
    taskIcon: { name: string; type: string; package?: string };
    color?: string;
    linkingURI?: string;
    foregroundServiceType?: string[];
    parameters?: Record<string, unknown>;
  }

  const BackgroundService: {
    start(task: (parameters?: Record<string, unknown>) => Promise<void>, options: BackgroundServiceOptions): Promise<void>;
    stop(): Promise<void>;
    isRunning(): boolean;
    updateNotification(options: Pick<BackgroundServiceOptions, "taskTitle" | "taskDesc">): Promise<void>;
  };

  export default BackgroundService;
}
