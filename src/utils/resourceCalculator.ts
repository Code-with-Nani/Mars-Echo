export type ResourceStatus = 'Normal' | 'Warning' | 'Critical' | 'Depleted';

export interface AstronautResourceProfile {
  startingOxygenPct: number;
  startingBatteryPct: number;
  startingCoolingPct: number;
  availableMissionHours: number;
  oxygenConsumptionPerHour: number;
  batteryConsumptionPerHour: number;
  coolingConsumptionPerHour: number;
}

export interface ResourceThresholds {
  warningPct: number;
  criticalPct: number;
}

export interface SingleResourceCalculation {
  remainingAmount: number;
  startingAmount: number;
  percentage: number;
  consumedAmount: number;
  consumptionRatePerHour: number;
  estimatedDepletionHours: number | null;
  status: ResourceStatus;
}

export interface RemainingTimeCalculation {
  remainingHours: number;
  availableHours: number;
  percentage: number;
  status: ResourceStatus;
}

export interface MissionResourceReport {
  elapsedHours: number;
  oxygen: SingleResourceCalculation;
  battery: SingleResourceCalculation;
  cooling: SingleResourceCalculation;
  missionTime: RemainingTimeCalculation;
  overallStatus: ResourceStatus;
}

/**
 * Simulated illustrative defaults for Module 2 demonstration.
 * These are NOT real NASA EVA PLSS suit telemetry or flight specifications.
 */
export const DEFAULT_ASTRONAUT_PROFILE: AstronautResourceProfile = {
  startingOxygenPct: 100,
  startingBatteryPct: 100,
  startingCoolingPct: 100,
  availableMissionHours: 6,
  oxygenConsumptionPerHour: 12.5,
  batteryConsumptionPerHour: 15,
  coolingConsumptionPerHour: 18,
};

export const DEFAULT_RESOURCE_THRESHOLDS: ResourceThresholds = {
  warningPct: 50,
  criticalPct: 25,
};

function sanitizeNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Normalizes warning/critical thresholds to guarantee valid ordering:
 * 0 < criticalPct <= warningPct <= 100.
 */
export function normalizeThresholds(
  thresholds: ResourceThresholds
): ResourceThresholds {
  const criticalPct = clampPercentage(thresholds.criticalPct);
  const warningPct = Math.max(criticalPct, clampPercentage(thresholds.warningPct));
  return { warningPct, criticalPct };
}

/**
 * Evaluates a resource's status from its remaining percentage and thresholds.
 */
export function evaluateResourceStatus(
  remainingPct: number,
  thresholds: ResourceThresholds
): ResourceStatus {
  const { warningPct, criticalPct } = normalizeThresholds(thresholds);
  if (remainingPct <= 0) return 'Depleted';
  if (remainingPct <= criticalPct) return 'Critical';
  if (remainingPct <= warningPct) return 'Warning';
  return 'Normal';
}

function computeSingleResource(
  startingPct: number,
  ratePerHour: number,
  elapsedHours: number,
  thresholds: ResourceThresholds
): SingleResourceCalculation {
  const safeStart = clampPercentage(startingPct);
  const safeRate = sanitizeNonNegative(ratePerHour);
  const safeElapsed = sanitizeNonNegative(elapsedHours);

  const consumedRaw = safeRate * safeElapsed;
  const remainingAmount = roundToTwo(Math.max(0, safeStart - consumedRaw));
  const consumedAmount = roundToTwo(Math.max(0, safeStart - remainingAmount));
  const percentage = roundToTwo(clampPercentage(remainingAmount));

  const estimatedDepletionHours =
    safeRate > 0 ? roundToTwo(safeStart / safeRate) : null;

  return {
    remainingAmount,
    startingAmount: roundToTwo(safeStart),
    percentage,
    consumedAmount,
    consumptionRatePerHour: roundToTwo(safeRate),
    estimatedDepletionHours,
    status: evaluateResourceStatus(percentage, thresholds),
  };
}

const STATUS_SEVERITY: Record<ResourceStatus, number> = {
  Normal: 0,
  Warning: 1,
  Critical: 2,
  Depleted: 3,
};

function worstStatus(statuses: ResourceStatus[]): ResourceStatus {
  return statuses.reduce<ResourceStatus>((worst, current) => {
    return STATUS_SEVERITY[current] > STATUS_SEVERITY[worst] ? current : worst;
  }, 'Normal');
}

/**
 * Deterministic astronaut resource calculation engine.
 *
 * Formulas:
 * - Oxygen remaining   = max(0, Starting oxygen - (Oxygen rate * elapsed hours))
 * - Battery remaining  = max(0, Starting battery - (Battery rate * elapsed hours))
 * - Cooling remaining  = max(0, Starting cooling - (Cooling rate * elapsed hours))
 * - Remaining time     = max(0, Available mission time - elapsed hours)
 */
export function calculateMissionResources(
  profile: AstronautResourceProfile,
  elapsedHours: number,
  thresholds: ResourceThresholds = DEFAULT_RESOURCE_THRESHOLDS
): MissionResourceReport {
  const safeElapsed = sanitizeNonNegative(elapsedHours);
  const safeAvailableHours = sanitizeNonNegative(profile.availableMissionHours);
  const normalizedThresholds = normalizeThresholds(thresholds);

  const oxygen = computeSingleResource(
    profile.startingOxygenPct,
    profile.oxygenConsumptionPerHour,
    safeElapsed,
    normalizedThresholds
  );

  const battery = computeSingleResource(
    profile.startingBatteryPct,
    profile.batteryConsumptionPerHour,
    safeElapsed,
    normalizedThresholds
  );

  const cooling = computeSingleResource(
    profile.startingCoolingPct,
    profile.coolingConsumptionPerHour,
    safeElapsed,
    normalizedThresholds
  );

  const remainingHours = roundToTwo(Math.max(0, safeAvailableHours - safeElapsed));
  const timePercentage =
    safeAvailableHours > 0
      ? roundToTwo(clampPercentage((remainingHours / safeAvailableHours) * 100))
      : 0;

  const missionTime: RemainingTimeCalculation = {
    remainingHours,
    availableHours: roundToTwo(safeAvailableHours),
    percentage: timePercentage,
    status: evaluateResourceStatus(timePercentage, normalizedThresholds),
  };

  const overallStatus = worstStatus([
    oxygen.status,
    battery.status,
    cooling.status,
    missionTime.status,
  ]);

  return {
    elapsedHours: roundToTwo(safeElapsed),
    oxygen,
    battery,
    cooling,
    missionTime,
    overallStatus,
  };
}

/**
 * Clamps elapsed simulation hours strictly within [0, availableMissionHours].
 */
export function clampElapsedHours(
  elapsedHours: number,
  availableMissionHours: number
): number {
  const safeAvailable = sanitizeNonNegative(availableMissionHours);
  const safeElapsed = sanitizeNonNegative(elapsedHours);
  return Math.min(safeAvailable, safeElapsed);
}

export interface MissionTimelinePoint {
  elapsedHours: number;
  oxygenPct: number;
  batteryPct: number;
  coolingPct: number;
  oxygenRemaining: number;
  batteryRemaining: number;
  coolingRemaining: number;
  timeRemainingHours: number;
  timePct: number;
  overallStatus: ResourceStatus;
}

/**
 * Generates deterministic time-series points from T+0 to availableMissionHours
 * directly via calculateMissionResources, including exact depletion inflection timestamps
 * so linear curves accurately reflect zero-clamping corners.
 */
export function generateMissionTimeline(
  profile: AstronautResourceProfile,
  thresholds: ResourceThresholds = DEFAULT_RESOURCE_THRESHOLDS,
  stepHours = 0.5
): MissionTimelinePoint[] {
  const maxHours = sanitizeNonNegative(profile.availableMissionHours);
  const safeStep = stepHours > 0 ? stepHours : 0.5;
  const timestamps = new Set<number>([0, roundToTwo(maxHours)]);

  for (let t = safeStep; t < maxHours; t += safeStep) {
    timestamps.add(roundToTwo(t));
  }

  // Include exact depletion timestamps so clamped flat-zero segments have sharp vertices
  const candidateInflections = [
    profile.oxygenConsumptionPerHour > 0
      ? clampPercentage(profile.startingOxygenPct) /
        profile.oxygenConsumptionPerHour
      : null,
    profile.batteryConsumptionPerHour > 0
      ? clampPercentage(profile.startingBatteryPct) /
        profile.batteryConsumptionPerHour
      : null,
    profile.coolingConsumptionPerHour > 0
      ? clampPercentage(profile.startingCoolingPct) /
        profile.coolingConsumptionPerHour
      : null,
  ];

  for (const t of candidateInflections) {
    if (t !== null && Number.isFinite(t) && t > 0 && t < maxHours) {
      timestamps.add(roundToTwo(t));
    }
  }

  const sortedTimes = Array.from(timestamps).sort((a, b) => a - b);

  return sortedTimes.map((t) => {
    const rep = calculateMissionResources(profile, t, thresholds);
    return {
      elapsedHours: rep.elapsedHours,
      oxygenPct: rep.oxygen.percentage,
      batteryPct: rep.battery.percentage,
      coolingPct: rep.cooling.percentage,
      oxygenRemaining: rep.oxygen.remainingAmount,
      batteryRemaining: rep.battery.remainingAmount,
      coolingRemaining: rep.cooling.remainingAmount,
      timeRemainingHours: rep.missionTime.remainingHours,
      timePct: rep.missionTime.percentage,
      overallStatus: rep.overallStatus,
    };
  });
}

export interface LowestResourceSummary {
  id: 'oxygen' | 'battery' | 'cooling';
  label: string;
  percentage: number;
  remainingDisplay: string;
  status: ResourceStatus;
  tiedLabels: string[];
}

/**
 * Derives the lowest remaining life-support resource (Oxygen, Battery, or Cooling)
 * directly from a MissionResourceReport.
 */
export function getLowestRemainingResource(
  report: MissionResourceReport
): LowestResourceSummary {
  const candidates: Array<{
    id: 'oxygen' | 'battery' | 'cooling';
    label: string;
    percentage: number;
    remainingDisplay: string;
    status: ResourceStatus;
  }> = [
    {
      id: 'oxygen',
      label: 'Oxygen',
      percentage: report.oxygen.percentage,
      remainingDisplay: `${report.oxygen.remainingAmount.toFixed(1)} units`,
      status: report.oxygen.status,
    },
    {
      id: 'battery',
      label: 'Battery',
      percentage: report.battery.percentage,
      remainingDisplay: `${report.battery.remainingAmount.toFixed(1)}%`,
      status: report.battery.status,
    },
    {
      id: 'cooling',
      label: 'Cooling Capacity',
      percentage: report.cooling.percentage,
      remainingDisplay: `${report.cooling.remainingAmount.toFixed(1)}%`,
      status: report.cooling.status,
    },
  ];

  const minPct = Math.min(...candidates.map((c) => c.percentage));
  const lowestItems = candidates.filter(
    (c) => Math.abs(c.percentage - minPct) < 0.001
  );
  const primary = lowestItems[0];

  return {
    id: primary.id,
    label:
      lowestItems.length > 1
        ? lowestItems.map((i) => i.label).join(' & ')
        : primary.label,
    percentage: primary.percentage,
    remainingDisplay: primary.remainingDisplay,
    status: primary.status,
    tiedLabels: lowestItems.map((i) => i.label),
  };
}

export type ReturnFeasibilityStatus = 'Sufficient' | 'Warning' | 'Insufficient';

export type OverallReturnFeasibility =
  | 'RETURN FEASIBLE'
  | 'RETURN AT RISK'
  | 'RETURN NOT FEASIBLE';

export interface ReturnJourneyProfile {
  returnDurationHours: number;
  oxygenRatePerHour: number;
  batteryRatePerHour: number;
  coolingRatePerHour: number;
}

export interface ReturnResourceComparison {
  id: 'oxygen' | 'battery' | 'cooling' | 'missionTime';
  label: string;
  unit: string;
  remaining: number;
  required: number;
  postReturnRemaining: number;
  margin: number;
  ratePerHour: number;
  maxReturnHours: number | null;
  status: ReturnFeasibilityStatus;
}

export interface ReturnFeasibilityReport {
  returnDurationHours: number;
  overallResult: OverallReturnFeasibility;
  resources: {
    oxygen: ReturnResourceComparison;
    battery: ReturnResourceComparison;
    cooling: ReturnResourceComparison;
    missionTime: ReturnResourceComparison;
  };
  limitingResource: ReturnResourceComparison;
  explanation: string;
}

/**
 * Simulated illustrative defaults for return-journey estimation.
 * Preliminary planning model only — not a validated NASA safety model.
 */
export const DEFAULT_RETURN_JOURNEY_PROFILE: ReturnJourneyProfile = {
  returnDurationHours: 1.5,
  oxygenRatePerHour: DEFAULT_ASTRONAUT_PROFILE.oxygenConsumptionPerHour,
  batteryRatePerHour: DEFAULT_ASTRONAUT_PROFILE.batteryConsumptionPerHour,
  coolingRatePerHour: DEFAULT_ASTRONAUT_PROFILE.coolingConsumptionPerHour,
};

const FEASIBILITY_SEVERITY: Record<ReturnFeasibilityStatus, number> = {
  Sufficient: 0,
  Warning: 1,
  Insufficient: 2,
};

function evaluateReturnResource(params: {
  id: 'oxygen' | 'battery' | 'cooling' | 'missionTime';
  label: string;
  unit: string;
  remaining: number;
  ratePerHour: number;
  returnDurationHours: number;
  criticalReservePct: number;
  availableBaselineForPct: number;
}): ReturnResourceComparison {
  const safeRemaining = sanitizeNonNegative(params.remaining);
  const safeRate = sanitizeNonNegative(params.ratePerHour);
  const safeDuration = sanitizeNonNegative(params.returnDurationHours);

  const required = roundToTwo(safeRate * safeDuration);
  const margin = roundToTwo(safeRemaining - required);
  const postReturnRemaining = roundToTwo(Math.max(0, margin));
  const maxReturnHours =
    safeRate > 0 ? roundToTwo(safeRemaining / safeRate) : null;

  let status: ReturnFeasibilityStatus = 'Sufficient';
  if (margin < 0) {
    status = 'Insufficient';
  } else {
    const postReturnPct =
      params.availableBaselineForPct > 0
        ? (postReturnRemaining / params.availableBaselineForPct) * 100
        : 0;
    const lowSafetyBuffer = required > 0 && margin < required * 0.2;
    const zeroReserveAtZeroReturn = safeDuration === 0 && safeRemaining <= 0;

    if (
      postReturnPct <= params.criticalReservePct ||
      lowSafetyBuffer ||
      zeroReserveAtZeroReturn
    ) {
      status = 'Warning';
    }
  }

  return {
    id: params.id,
    label: params.label,
    unit: params.unit,
    remaining: roundToTwo(safeRemaining),
    required,
    postReturnRemaining,
    margin,
    ratePerHour: roundToTwo(safeRate),
    maxReturnHours,
    status,
  };
}

/**
 * Compares return-journey resource requirements against the astronaut's
 * current remaining resources from MissionResourceReport.
 */
export function estimateReturnFeasibility(
  report: MissionResourceReport,
  returnProfile: ReturnJourneyProfile,
  thresholds: ResourceThresholds = DEFAULT_RESOURCE_THRESHOLDS
): ReturnFeasibilityReport {
  const normalized = normalizeThresholds(thresholds);
  const duration = sanitizeNonNegative(returnProfile.returnDurationHours);

  const oxygen = evaluateReturnResource({
    id: 'oxygen',
    label: 'Oxygen',
    unit: 'units',
    remaining: report.oxygen.remainingAmount,
    ratePerHour: returnProfile.oxygenRatePerHour,
    returnDurationHours: duration,
    criticalReservePct: normalized.criticalPct,
    availableBaselineForPct: 100,
  });

  const battery = evaluateReturnResource({
    id: 'battery',
    label: 'Battery',
    unit: '%',
    remaining: report.battery.remainingAmount,
    ratePerHour: returnProfile.batteryRatePerHour,
    returnDurationHours: duration,
    criticalReservePct: normalized.criticalPct,
    availableBaselineForPct: 100,
  });

  const cooling = evaluateReturnResource({
    id: 'cooling',
    label: 'Cooling Capacity',
    unit: '%',
    remaining: report.cooling.remainingAmount,
    ratePerHour: returnProfile.coolingRatePerHour,
    returnDurationHours: duration,
    criticalReservePct: normalized.criticalPct,
    availableBaselineForPct: 100,
  });

  const missionTime = evaluateReturnResource({
    id: 'missionTime',
    label: 'Mission Time',
    unit: 'hrs',
    remaining: report.missionTime.remainingHours,
    ratePerHour: 1,
    returnDurationHours: duration,
    criticalReservePct: normalized.criticalPct,
    availableBaselineForPct: report.missionTime.availableHours,
  });

  const all = [oxygen, battery, cooling, missionTime];

  // Overall return feasibility derived strictly from worst individual resource status
  const worstSeverity = Math.max(
    ...all.map((r) => FEASIBILITY_SEVERITY[r.status])
  );

  const overallResult: OverallReturnFeasibility =
    worstSeverity === 2
      ? 'RETURN NOT FEASIBLE'
      : worstSeverity === 1
        ? 'RETURN AT RISK'
        : 'RETURN FEASIBLE';

  // Limiting resource: highest severity first, then lowest maxReturnHours
  const sortedByBottleneck = [...all].sort((a, b) => {
    const sevDiff =
      FEASIBILITY_SEVERITY[b.status] - FEASIBILITY_SEVERITY[a.status];
    if (sevDiff !== 0) return sevDiff;

    const aMax = a.maxReturnHours ?? Number.POSITIVE_INFINITY;
    const bMax = b.maxReturnHours ?? Number.POSITIVE_INFINITY;
    if (aMax !== bMax) return aMax - bMax;

    return a.margin - b.margin;
  });

  const limitingResource = sortedByBottleneck[0];

  const unitSuffix =
    limitingResource.unit === '%' ? '%' : ` ${limitingResource.unit}`;

  let explanation: string;
  if (limitingResource.status === 'Insufficient') {
    const deficit = Math.abs(limitingResource.margin).toFixed(2).replace(/\.00$/, '');
    const maxHoursText =
      limitingResource.maxReturnHours !== null
        ? `${limitingResource.maxReturnHours.toFixed(2)} hrs`
        : '0 hrs';
    explanation = `${limitingResource.label} is the limiting resource: ${limitingResource.remaining.toFixed(1)}${unitSuffix} remaining is ${deficit}${unitSuffix} short of the ${limitingResource.required.toFixed(1)}${unitSuffix} required for a ${duration.toFixed(2)}h return (supports at most ${maxHoursText}).`;
  } else if (limitingResource.status === 'Warning') {
    const maxHoursText =
      limitingResource.maxReturnHours !== null
        ? `${limitingResource.maxReturnHours.toFixed(2)} hrs`
        : 'unlimited';
    explanation = `${limitingResource.label} is the limiting resource: a ${duration.toFixed(2)}h return leaves only ${limitingResource.postReturnRemaining.toFixed(1)}${unitSuffix} reserve (max supported return: ${maxHoursText}).`;
  } else {
    const maxHoursText =
      limitingResource.maxReturnHours !== null
        ? `${limitingResource.maxReturnHours.toFixed(2)} hrs`
        : 'unlimited';
    explanation = `${limitingResource.label} is the tightest constraint, supporting up to ${maxHoursText} of return travel and leaving ${limitingResource.postReturnRemaining.toFixed(1)}${unitSuffix} reserve after a ${duration.toFixed(2)}h return.`;
  }

  return {
    returnDurationHours: roundToTwo(duration),
    overallResult,
    resources: {
      oxygen,
      battery,
      cooling,
      missionTime,
    },
    limitingResource,
    explanation,
  };
}


