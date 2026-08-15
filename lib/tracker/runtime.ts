import { nativeTrackerService } from "@/lib/tracker/NativeTrackerService";
import { TrackingController } from "@/lib/tracker/TrackingController";

/** 生产环境的应用层控制器装配点。 */
export const trackingController = new TrackingController(nativeTrackerService);
