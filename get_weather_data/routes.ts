import { Router } from 'express';
import { Get_Temperture_Wind_Data, Get_Temperture_Wind_Nationwide } from './temperture_wind/controller/Get_Temperture_Wind_Data';
import { Get_Pm_Data, Get_Pm_Nationwide } from './pm/controller/Get_Pm_Data';
import { Get_UV_Data, Get_UV_Nationwide } from './uv/controller/Get_UV_Data';
const router = Router();


router.get('/pm', Get_Pm_Data)
router.get('/pm/nationwide', Get_Pm_Nationwide)
router.get('/temperture_wind', Get_Temperture_Wind_Data)
router.get('/temperture_wind/nationwide', Get_Temperture_Wind_Nationwide)
router.get('/uv', Get_UV_Data)
router.get('/uv/nationwide', Get_UV_Nationwide)



export default router