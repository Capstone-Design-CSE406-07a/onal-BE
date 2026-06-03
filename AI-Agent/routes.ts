import { Router } from 'express';
import { AiResponse } from './controller/AiResponse';
import { GroqResponse } from './controller/GroqResponse';
import { AgentResponse, ClearHistory } from './controller/AgentResponse';

const router = Router();

router.get('/question', AiResponse);
router.get('/question/groq', GroqResponse);
router.post('/question/agent', AgentResponse);
router.delete('/history', ClearHistory);

export default router;
