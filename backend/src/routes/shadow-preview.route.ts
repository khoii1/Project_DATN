import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { deviceRepository } from "../repositories/device.repository";
import { AppError } from "../utils/app-error";
import { previewQuerySchema, previewShadow, type PreviewQuery } from "../services/shadow-preview/preview.service";

export const shadowPreviewRouter = Router();
shadowPreviewRouter.use(authenticate);
shadowPreviewRouter.get("/", validate(previewQuerySchema, "query"), async (req, res, next) => {
  try {
    const query = req.query as unknown as PreviewQuery;
    // Uses existing RBAC/farm scope, SELECT only. Real device data is NOT used as fixture trust.
    const device = await deviceRepository.findAccessibleById(query.deviceId, req.user!);
    if (!device || device.deviceCode !== "ESP32-GF-A-01") throw new AppError(404, "Không tìm thấy thiết bị trong phạm vi preview");
    res.set("Cache-Control", "no-store");
    res.json({ success: true, message: "Kết quả mô phỏng, không gửi lệnh điều khiển", data: previewShadow(query, new Date().toISOString()) });
  } catch (error) { next(error); }
});
