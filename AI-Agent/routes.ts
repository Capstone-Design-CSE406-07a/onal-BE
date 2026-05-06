import { Router } from 'express';
import { AiResponse } from './controller/AiResponse';
import { GroqResponse } from './controller/GroqResponse';

const router = Router();

router.get('/question', AiResponse);
router.get('/question/groq', GroqResponse);

export default router;
