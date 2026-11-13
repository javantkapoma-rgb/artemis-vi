export const CLINICAL_THRESHOLDS = {
  cardiovascular: {
    restingHeartRate: {
      min: 50,
      max: 90,
      flagAbove: 100,
      unit: "bpm",
    },
    qtc: {
      minMs: 350,
      maxMs: 450,
      flagAboveMs: 500,
      unit: "ms",
    },
  },
  sleep: {
    targetMinHours: 6,
    targetMaxHours: 8,
    chronicInsomniaFlagBelowHours: 6,
    unit: "hours",
  },
  psychological: {
    stressScaleMax: 10,
    stressNormalBelow: 5,
    stressHighAtOrAbove: 7,
    unit: "score",
  },
  environmental: {
    cabinCo2MaxMmHg: 45,
    radiationCareerLimitMsv: 600,
  },
} as const;

export type ClinicalThresholds = typeof CLINICAL_THRESHOLDS;