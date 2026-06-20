import { Router } from 'express';
import type { Request, Response } from 'express';
import type { AudiogramRequest, DynamicRangeResponse } from '../types';
import { calculateDynamicRange } from '../services/audiogramService';

const router = Router();

router.post('/dynamic-range', (req: Request, res: Response) => {
  try {
    const body = req.body as AudiogramRequest;
    
    if (!body.leftEar || !body.rightEar) {
      return res.status(400).json({
        error: '缺少听力图数据，请提供leftEar和rightEar参数',
      });
    }
    
    if (!Array.isArray(body.leftEar) || !Array.isArray(body.rightEar)) {
      return res.status(400).json({
        error: '听力图数据格式错误，应为数组格式',
      });
    }
    
    const leftRange = calculateDynamicRange(body.leftEar);
    const rightRange = calculateDynamicRange(body.rightEar);
    
    const response: DynamicRangeResponse = {
      leftEar: leftRange,
      rightEar: rightRange,
    };
    
    return res.json(response);
  } catch (error) {
    console.error('Dynamic range calculation error:', error);
    return res.status(500).json({
      error: '计算听觉动态范围时发生错误',
    });
  }
});

export default router;
