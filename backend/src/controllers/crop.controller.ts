import type { NextFunction, Request, Response } from "express";
import { cropService } from "../services/crop.service";
import type { CreateCropInput, CropListQuery, UpdateCropInput } from "../validators/crop.schema";

export async function listCrops(request: Request, response: Response, next: NextFunction) { try { response.json({ success: true, message: "Lấy danh sách cây trồng thành công", data: await cropService.list(request.query as unknown as CropListQuery, request.user!) }); } catch (error) { next(error); } }
export async function getCrop(request: Request, response: Response, next: NextFunction) { try { response.json({ success: true, message: "Lấy cây trồng thành công", data: { crop: await cropService.getById(request.params.id as string, request.user!) } }); } catch (error) { next(error); } }
export async function createCrop(request: Request, response: Response, next: NextFunction) { try { response.status(201).json({ success: true, message: "Tạo cây trồng thành công", data: { crop: await cropService.create(request.body as CreateCropInput, request.user!, request.ip) } }); } catch (error) { next(error); } }
export async function updateCrop(request: Request, response: Response, next: NextFunction) { try { response.json({ success: true, message: "Cập nhật cây trồng thành công", data: { crop: await cropService.update(request.params.id as string, request.body as UpdateCropInput, request.user!, request.ip) } }); } catch (error) { next(error); } }

