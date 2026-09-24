import type { NextFunction, Request, Response } from "express";
import { deviceCommandService } from "../services/device-command.service";
import type { CommandListQuery } from "../validators/device-command.schema";
export async function listDeviceCommands(req: Request, res: Response, next: NextFunction) { try { res.json({ success: true, message: "Lấy lịch sử lệnh thành công", data: await deviceCommandService.list(req.query as unknown as CommandListQuery, req.user!) }); } catch (error) { next(error); } }
