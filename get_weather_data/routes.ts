import { Router } from 'express';
import { Get_Temperture_Wind_Data } from './temperture_wind/controller/Get_Temperture_Wind_Data';
import { Get_Pm_Data } from './pm/controller/Get_Pm_Data';
import { Get_UV_Data } from './uv/controller/Get_UV_Data';
const router = Router();


router.get('/pm',Get_Pm_Data)
router.get('/temperture_wind',Get_Temperture_Wind_Data)
router.get('/uv',Get_UV_Data)



export default router