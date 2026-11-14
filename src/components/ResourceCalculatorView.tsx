import React, { useEffect, useMemo, useState } from 'react';
import {
  Battery,
  Clock,
  Info,
  RotateCcw,
  Snowflake,
  Wind,
} from 'lucide-react';
import {
  DEFAULT_ASTRONAUT_PROFILE,
  DEFAULT_RESOURCE_THRESHOLDS,
  DEFAULT_RETURN_JOURNEY_PROFILE,
  calculateMissionResources,
  clampElapsedHours,
  estimateReturnFeasibility,
  normalizeThresholds,
  type AstronautResourceProfile,
  type ResourceThresholds,
  type ReturnJourneyProfile,
} from '../utils/resourceCalculator';
import { getResourceStatusStyle } from '../utils/resourceStatusStyles';
import { ResourceStatusCard } from './eva/ResourceStatusCard';
import {
  SimulationControls,
  type SimulationSpeed,
} from './eva/SimulationControls';
import { MissionResourceSummary } from './eva/MissionResourceSummary';
import { ResourceConsumptionChart } from './eva/ResourceConsumptionChart';
import { ResourceProfileConfig } from './eva/ResourceProfileConfig';
import { ReturnReserveEstimator } from './eva/ReturnReserveEstimator';

interface ResourceCalculatorViewProps {
  profile: AstronautResourceProfile;
  onChangeProfile: React.Dispatch<React.SetStateAction<AstronautResourceProfile>>;
  thresholds: ResourceThresholds;
  onChangeThresholds: React.Dispatch<React.SetStateAction<ResourceThresholds>>;
  elapsedHours: number;
  onChangeElapsedHours: React.Dispatch<React.SetStateAction<number>>;
  returnProfile: ReturnJourneyProfile;
  onChangeReturnProfile: React.Dispatch<React.SetStateAction<ReturnJourneyProfile>>;
  onResetAll: () => void;
}

export const ResourceCalculatorView: React.FC<ResourceCalculatorViewProps> = ({
  profile,
  onChangeProfile: setProfile,
  thresholds,
  onChangeThresholds: setThresholds,
  elapsedHours,
  onChangeElapsedHours: setElapsedHours,
  returnProfile,
  onChangeReturnProfile: setReturnProfile,
  onResetAll,
}) => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [simSpeed, setSimSpeed] = useState<SimulationSpeed>(1);
  const [isConfigExpanded, setIsConfigExpanded] = useState<boolean>(false);

  const normalizedThresholds = useMemo(
    () => normalizeThresholds(thresholds),
    [thresholds]
  );

  // Clamp elapsed hours strictly to [0, availableMissionHours]
  const clampedElapsed = useMemo(
    () => clampElapsedHours(elapsedHours, profile.availableMissionHours),
    [elapsedHours, profile.availableMissionHours]
  );

  const report = useMemo(
    () =>
      calculateMissionResources(
        profile,
        clampedElapsed,
        normalizedThresholds
      ),
    [profile, clampedElapsed, normalizedThresholds]
  );

  const returnFeasibility = useMemo(
    () =>
      estimateReturnFeasibility(
        report,
        returnProfile,
        normalizedThresholds
      ),
    [report, returnProfile, normalizedThresholds]
  );

  // Auto-stop simulation when reaching availableMissionHours
  useEffect(() => {
    if (
      isRunning &&
      (profile.availableMissionHours <= 0 ||
        clampedElapsed >= profile.availableMissionHours)
    ) {
      setIsRunning(false);
    }
  }, [isRunning, clampedElapsed, profile.availableMissionHours]);

  // Live simulation interval advancing elapsedHours deterministically
  useEffect(() => {
    if (!isRunning) return;

    const tickMs = 100;
    const simulatedHoursPerSecond = simSpeed * 0.25;
    const stepPerTick = simulatedHoursPerSecond * (tickMs / 1000);

    const timerId = window.setInterval(() => {
      setElapsedHours((prev) => {
        const next = prev + stepPerTick;
        return clampElapsedHours(
          Math.round(next * 1000) / 1000,
          profile.availableMissionHours
        );
      });
    }, tickMs);

    return () => window.clearInterval(timerId);
  }, [isRunning, simSpeed, profile.availableMissionHours, setElapsedHours]);

  const handleStart = () => {
    if (
      profile.availableMissionHours > 0 &&
      clampedElapsed < profile.availableMissionHours
    ) {
      setIsRunning(true);
    }
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleResetSimulation = () => {
    setIsRunning(false);
    setElapsedHours(0);
  };

  const handleStepHours = (delta: number) => {
    setElapsedHours((prev) =>
      clampElapsedHours(
        Math.round((prev + delta) * 100) / 100,
        profile.availableMissionHours
      )
    );
  };

  const handleSetElapsedHours = (hours: number) => {
    setElapsedHours(clampElapsedHours(hours, profile.availableMissionHours));
  };

  const handleResetDefaults = () => {
    setIsRunning(false);
    onResetAll();
    setSimSpeed(1);
  };

  const handleUpdateReturnField = (
    field: keyof ReturnJourneyProfile,
    rawValue: string
  ) => {
    const parsed = parseFloat(rawValue);
    const safeVal = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    const clamped =
      field === 'returnDurationHours' ? Math.min(24, safeVal) : Math.min(100, safeVal);
    setReturnProfile((prev) => ({ ...prev, [field]: clamped }));
  };

  const handleSyncReturnRatesToEva = () => {
    setReturnProfile((prev) => ({
      ...prev,
      oxygenRatePerHour: profile.oxygenConsumptionPerHour,
      batteryRatePerHour: profile.batteryConsumptionPerHour,
      coolingRatePerHour: profile.coolingConsumptionPerHour,
    }));
  };

  const updateProfileField = (
    field: keyof AstronautResourceProfile,
    rawValue: string
  ) => {
    const parsed = parseFloat(rawValue);
    const safeVal = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    const clamped =
      field === 'startingOxygenPct' ||
      field === 'startingBatteryPct' ||
      field === 'startingCoolingPct'
        ? Math.min(100, safeVal)
        : field === 'availableMissionHours'
          ? Math.min(24, safeVal)
          : safeVal;

    setProfile((prev) => {
      const updated = { ...prev, [field]: clamped };
      if (field === 'availableMissionHours') {
        setElapsedHours((cur) => clampElapsedHours(cur, clamped));
      }
      return updated;
    });
  };

  const updateThresholdField = (
    field: keyof ResourceThresholds,
    rawValue: string
  ) => {
    const parsed = parseFloat(rawValue);
    const clamped = Number.isFinite(parsed)
      ? Math.max(0, Math.min(100, parsed))
      : 0;
    setThresholds((prev) => ({ ...prev, [field]: clamped }));
  };

  const overallStyle = getResourceStatusStyle(report.overallStatus);
  const OverallIcon = overallStyle.Icon;

  return (
    <div className="h-full overflow-y-auto bg-[#07173F] p-4 sm:p-5 lg:p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        {/* Dashboard Header */}
        <div className="flex flex-col gap-3 border-b border-[#0042A6] pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1 max-w-3xl">
            <div className="text-xs font-medium text-[#2F96F5]">
              Module 2 · EVA Resource Intelligence
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-[#FFFFFF]">
              EVA Resource Monitor Dashboard
            </h2>
            <p className="text-xs leading-relaxed text-[#FFFFFF]/75">
              Real-time simulated monitoring of astronaut oxygen, battery, thermal
              cooling capacity, and remaining EVA mission window powered by the
              deterministic resourceCalculator engine.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div
              className={`flex items-center gap-2 rounded-md border bg-[#0042A6]/30 px-3 py-2 text-xs ${overallStyle.borderClass}`}
            >
              <OverallIcon
                className={`h-4 w-4 shrink-0 ${
                  report.overallStatus === 'Depleted'
                    ? 'text-[#E43700]'
                    : overallStyle.textClass
                }`}
                aria-hidden="true"
              />
              <span className="text-[#FFFFFF]/75">Overall Condition:</span>
              <span className={`font-semibold ${overallStyle.labelContainerClass}`}>
                {report.overallStatus}
              </span>
            </div>

            <button
              type="button"
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#2F96F5]/50 bg-[#0042A6] px-3 py-2 text-xs font-medium text-[#FFFFFF] hover:bg-[#0960E1] transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F96F5]"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Restore Defaults</span>
            </button>
          </div>
        </div>

        {/* Simulated Assumptions Notice */}
        <div className="flex items-start gap-2.5 rounded-md border border-[#2F96F5]/45 bg-[#0042A6]/30 px-3.5 py-2.5 text-xs text-[#FFFFFF]/85">
          <Info
            className="mt-0.5 h-4 w-4 shrink-0 text-[#EAFE07]"
            aria-hidden="true"
          />
          <div>
            <span className="font-semibold text-[#FFFFFF]">
              Simulated Telemetry &amp; Assumptions Notice:
            </span>{' '}
            All displayed values, starting reserves, consumption rates, and
            status thresholds are simulated mission planning assumptions—not
            live NASA EVA spacesuit telemetry.
          </div>
        </div>

        {/* Simulation Playback & Manual Time Controls */}
        <SimulationControls
          elapsedHours={clampedElapsed}
          availableMissionHours={profile.availableMissionHours}
          isRunning={isRunning}
          simSpeed={simSpeed}
          onStart={handleStart}
          onPause={handlePause}
          onReset={handleResetSimulation}
          onStepHours={handleStepHours}
          onSetElapsedHours={handleSetElapsedHours}
          onChangeSpeed={setSimSpeed}
        />

        {/* Four Primary Resource Status Indicators */}
        <section aria-label="Mission Resource Indicators">
          <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
            <ResourceStatusCard
              title="Oxygen Remaining"
              Icon={Wind}
              remainingDisplay={report.oxygen.remainingAmount.toFixed(1)}
              remainingUnit="units"
              initialDisplay={`${report.oxygen.startingAmount.toFixed(1)} units`}
              consumptionRateDisplay={`${report.oxygen.consumptionRatePerHour.toFixed(1)} units/hr`}
              percentage={report.oxygen.percentage}
              status={report.oxygen.status}
              zeroMarkHours={report.oxygen.estimatedDepletionHours}
            />

            <ResourceStatusCard
              title="Battery Remaining"
              Icon={Battery}
              remainingDisplay={report.battery.remainingAmount.toFixed(1)}
              remainingUnit="%"
              initialDisplay={`${report.battery.startingAmount.toFixed(1)}%`}
              consumptionRateDisplay={`${report.battery.consumptionRatePerHour.toFixed(1)}%/hr`}
              percentage={report.battery.percentage}
              status={report.battery.status}
              zeroMarkHours={report.battery.estimatedDepletionHours}
            />

            <ResourceStatusCard
              title="Cooling Capacity"
              Icon={Snowflake}
              remainingDisplay={report.cooling.remainingAmount.toFixed(1)}
              remainingUnit="%"
              initialDisplay={`${report.cooling.startingAmount.toFixed(1)}%`}
              consumptionRateDisplay={`${report.cooling.consumptionRatePerHour.toFixed(1)}%/hr`}
              percentage={report.cooling.percentage}
              status={report.cooling.status}
              zeroMarkHours={report.cooling.estimatedDepletionHours}
            />

            <ResourceStatusCard
              title="Remaining Mission Time"
              Icon={Clock}
              remainingDisplay={report.missionTime.remainingHours.toFixed(2)}
              remainingUnit="hrs"
              initialDisplay={`${report.missionTime.availableHours.toFixed(1)} hrs`}
              consumptionRateDisplay="1.0 hr/hr"
              percentage={report.missionTime.percentage}
              status={report.missionTime.status}
              zeroMarkHours={report.missionTime.availableHours}
            />
          </div>
        </section>

        {/* Derived Mission Resource Summary */}
        <MissionResourceSummary report={report} />

        {/* Return Reserve Feasibility Estimator */}
        <ReturnReserveEstimator
          returnProfile={returnProfile}
          feasibility={returnFeasibility}
          thresholds={normalizedThresholds}
          onUpdateReturnField={handleUpdateReturnField}
          onSyncToEvaRates={handleSyncReturnRatesToEva}
        />

        {/* Resource Consumption Over Time Chart */}
        <ResourceConsumptionChart
          profile={profile}
          thresholds={normalizedThresholds}
          currentReport={report}
        />

        {/* Configurable Simulated Profile & Thresholds */}
        <ResourceProfileConfig
          profile={profile}
          thresholds={thresholds}
          normalizedThresholds={normalizedThresholds}
          isExpanded={isConfigExpanded}
          onToggleExpand={() => setIsConfigExpanded((prev) => !prev)}
          onUpdateProfileField={updateProfileField}
          onUpdateThresholdField={updateThresholdField}
        />
      </div>
    </div>
  );
};
