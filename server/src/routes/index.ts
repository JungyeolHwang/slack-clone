import { Router } from 'express';

const router = Router();

// 기본 라우트
router.get('/', (req, res) => {
  res.json({ 
    message: 'Slack Clone API Server',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// 헬스 체크
router.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    database: 'connected',
    timestamp: new Date().toISOString()
  });
});

export default router; 