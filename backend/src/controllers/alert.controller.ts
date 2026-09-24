import type { NextFunction, Request, Response } from "express";
import { alertService } from "../services/alert.service";
import type { AlertListQuery } from "../validators/alert.schema";
export async function listAlerts(req: Request, res: Response, next: NextFunction) { try { res.json({ success: true, message: "Lấy danh sách cảnh báo thành công", data: await alertService.list(req.query as unknown as AlertListQuery, req.user!) }); } catch (error) { next(error); } }
export async function getAlertSummary(req: Request, res: Response, next: NextFunction) { try { res.json({ success: true, message: "Lấy tổng quan cảnh báo thành công", data: await alertService.summary(req.user!) }); } catch (error) { next(error); } }
export async function getAlert(req: Request, res: Response, next: NextFunction) { try { res.json({ success: true, message: "Lấy cảnh báo thành công", data: { alert: await alertService.get(req.params.id as string, req.user!) } }); } catch (error) { next(error); } }
export async function acknowledgeAlert(req: Request, res: Response, next: NextFunction) { try { res.json({ success: true, message: "Đã xác nhận cảnh báo", data: { alert: await alertService.acknowledge(req.params.id as string, req.user!, req.ip) } }); } catch (error) { next(error); } }
export async function resolveAlert(req: Request, res: Response, next: NextFunction) { try { res.json({ success: true, message: "Đã đóng cảnh báo", data: { alert: await alertService.resolve(req.params.id as string, req.user!, req.ip) } }); } catch (error) { next(error); } }
