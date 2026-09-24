import type { NextFunction, Request, Response } from "express";
import { zoneService } from "../services/zone.service";
import type { CreateZoneInput, UpdateZoneInput, ZoneListQuery } from "../validators/zone.schema";

export async function listZones(request: Request, response: Response, next: NextFunction) { try { response.json({ success: true, message: "Lấy danh sách khu vực thành công", data: await zoneService.list(request.query as unknown as ZoneListQuery, request.user!) }); } catch (error) { next(error); } }
export async function getZone(request: Request, response: Response, next: NextFunction) { try { response.json({ success: true, message: "Lấy khu vực thành công", data: { zone: await zoneService.getById(request.params.id as string, request.user!) } }); } catch (error) { next(error); } }
export async function createZone(request: Request, response: Response, next: NextFunction) { try { response.status(201).json({ success: true, message: "Tạo khu vực thành công", data: { zone: await zoneService.create(request.body as CreateZoneInput, request.user!, request.ip) } }); } catch (error) { next(error); } }
export async function updateZone(request: Request, response: Response, next: NextFunction) { try { response.json({ success: true, message: "Cập nhật khu vực thành công", data: { zone: await zoneService.update(request.params.id as string, request.body as UpdateZoneInput, request.user!, request.ip) } }); } catch (error) { next(error); } }

