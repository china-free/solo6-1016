import { Router } from 'express';
import type { Request, Response } from 'express';
import type { MaskingCalculationRequest } from '../types';
import { calculateMaskingParameters } from '../services/psychoacousticModel';

const router = Router();

router.post('/calculate', (req: Request, res: Response) => {
  try {
    const body = req.body as MaskingCalculationRequest;
    
    if (!body.audiogram || !body.tinnitus) {
      return res.status(400).json({
        error: '缺少必要参数：audiogram和tinnitus',
      });
    }
    
    if (!body.audiogram.leftEar || !body.audiogram.rightEar) {
      return res.status(400).json({
        error: '听力图数据不完整，请提供leftEar和rightEar',
      });
    }
    
    if (!body.tinnitus.frequency || !body.tinnitus.type) {
      return res.status(400).json({
        error: '耳鸣特征不完整，请提供frequency和type',
      });
    }
    
    const validTypes = ['pure_tone', 'narrowband', 'broadband'];
    if (!validTypes.includes(body.tinnitus.type)) {
      return res.status(400).json({
        error: `耳鸣类型无效，可选值：${validTypes.join(', ')}`,
      });
    }
    
    if (body.tinnitus.loudness < 1 || body.tinnitus.loudness > 10) {
      return res.status(400).json({
        error: '耳鸣响度应在1-10范围内',
      });
    }
    
    const result = calculateMaskingParameters(body.audiogram, body.tinnitus);
    
    return res.json(result);
  } catch (error) {
    console.error('Masking calculation error:', error);
    return res.status(500).json({
      error: '计算掩蔽声参数时发生错误',
    });
  }
});

export default router;
