import type {
  FrequencyPoint,
  DynamicRangePoint,
  MaskingParameters,
  TinnitusInfo,
} from '../types';

const API_BASE = '/api';

export const fetchDynamicRange = async (
  leftEar: FrequencyPoint[],
  rightEar: FrequencyPoint[]
): Promise<{ leftEar: DynamicRangePoint[]; rightEar: DynamicRangePoint[] }> => {
  const response = await fetch(`${API_BASE}/audiogram/dynamic-range`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ leftEar, rightEar }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || '获取动态范围失败');
  }

  return response.json();
};

export const fetchMaskingParameters = async (
  audiogram: { leftEar: FrequencyPoint[]; rightEar: FrequencyPoint[] },
  tinnitus: TinnitusInfo
): Promise<MaskingParameters> => {
  const response = await fetch(`${API_BASE}/masking/calculate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ audiogram, tinnitus }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || '计算掩蔽参数失败');
  }

  return response.json();
};
