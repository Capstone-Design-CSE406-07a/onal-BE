import { Router } from 'express';
import { Get_Temperture_Wind_Data } from './controller/Get_Temperture_Wind_Data';

const router = Router();

router.get('/temperture_wind',Get_Temperture_Wind_Data)


export default router