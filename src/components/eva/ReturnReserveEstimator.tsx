import React from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  Compass,
  Info,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import type {
  OverallReturnFeasibility,
  ResourceThresholds,
  ReturnFeasibilityReport,
  ReturnFeasibilityStatus,
  ReturnJourneyProfile,
  ReturnResourceComparison,
} from '../../utils/resourceCalculator';

interface ReturnReserveEstimatorProps {
  returnProfile: ReturnJourneyProfile;
  feasibility: ReturnFeasibilityReport;
  thresholds: ResourceThresholds;
  onUpdateReturnField: (
    field: keyof ReturnJourneyProfile,
    rawValue: string
  ) => void;
  onSyncToEvaRates: () => void;
}

function getResourceFeasibilityVisual(status: ReturnFeasibilityStatus): {
  textClass: string;
  borderClass: string;
  badgeClass: string;
  Icon: React.ComponentType<{ className?: string }>;
} {
  switch (status) {
    case 'Sufficient':
      return {
        textClass: 'text-[#2F96F5]',
        borderClass: 'border-[#0042A6]',
        badgeClass: 'text-[#2F96F5]',
        Icon: CheckCircle2,
      };
    case 'Warning':
      return {
        textClass: 'text-[#EAFE07]',
        borderClass: 'border-[#EAFE07]/60',
        badgeClass: 'text-[#EAFE07]',
        Icon: AlertTriangle,
      };
    case 'Insufficient':
      return {
        textClass: 'text-[#E43700]',
        borderClass: 'border-[#E43700]',
        badgeClass:
          'rounded bg-[#8E1100] px-1.5 py-0.5 text-[#FFFFFF] border border-[#E43700]/80',
        Icon: XCircle,
      };
  }
}

function getOverallFeasibilityVisual(result: OverallReturnFeasibility): {
  containerClass: string;
  labelClass: string;
  iconClass: string;
  Icon: React.ComponentType<{ className?: string }>;
} {
  switch (result) {
    case 'RETURN FEASIBLE':
      return {
        containerClass: 'border-[#2F96F5]/60 bg-[#07173F]',
        labelClass: 'text-[#2F96F5]',
        iconClass: 'text-[#2F96F5]',
        Icon: CheckCircle2,
      };
    case 'RETURN AT RISK':
      return {
        containerClass: 'border-[#EAFE07]/70 bg-[#07173F]',
        labelClass: 'text-[#EAFE07]',
        iconClass: 'text-[#EAFE07]',
        Icon: AlertTriangle,
      };
    case 'RETURN NOT FEASIBLE':
      return {
        containerClass: 'border-[#E43700] bg-[#8E1100]/35',
        labelClass: 'text-[#FFFFFF]',
        iconClass: 'text-[#E43700]',
        Icon: XCircle,
      };
  }
}

function formatAmount(value: number, unit: string): string {
  const decimals = unit === 'hrs' ? 2 : 1;
  return unit === '%'
    ? `${value.toFixed(decimals)}%`
    : `${value.toFixed(decimals)} ${unit}`;
}

export const ReturnReserveEstimator: React.FC<ReturnReserveEstimatorProps> = ({
  returnProfile,
  feasibility,
  thresholds,
  onUpdateReturnField,
  onSyncToEvaRates,
}) => {
  const overallVis = getOverallFeasibilityVisual(feasibility.overallResult);
  const OverallIcon = overallVis.Icon;

  const comparisonList: ReturnResourceComparison[] = [
    feasibility.resources.oxygen,
    feasibility.resources.battery,
    feasibility.resources.cooling,
    feasibility.resources.missionTime,
  ];

  return (
    <section
      className="rounded-md border border-[#0042A6] bg-[#0042A6]/25 p-4 space-y-4"
      aria-label="Return Reserve Estimator"
    >
      {/* Header */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border-b border-[#0042A6]/80 pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-[#2F96F5]" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-[#FFFFFF]">
              Return Reserve Estimator
            </h3>
          </div>
          <p className="text-[11px] text-[#FFFFFF]/70">
            Compares estimated return-journey consumption against current remaining EVA reserves.
          </p>
        </div>

        <button
          type="button"
          onClick={onSyncToEvaRates}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded border border-[#2F96F5]/45 bg-[#07173F] px-2.5 py-1.5 text-xs font-medium text-[#FFFFFF] hover:bg-[#0960E1] transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F96F5]"
        >
          <RefreshCw className="h-3.5 w-3.5 text-[#2F96F5]" aria-hidden="true" />
          <span>Match EVA Rates</span>
        </button>
      </div>

      {/* Preliminary Disclaimer */}
      <div className="flex items-start gap-2 rounded border border-[#0042A6] bg-[#07173F]/80 px-3 py-2 text-[11px] text-[#FFFFFF]/80">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#EAFE07]" aria-hidden="true" />
        <span>
          <span className="font-semibold text-[#FFFFFF]">
            Preliminary Simulation Only:
          </span>{' '}
          Deterministic linear reserve comparison for planning demonstration—not a
          validated NASA EVA safety or life-support certification model. Warning
          triggers when post-return reserve falls to &le;{thresholds.criticalPct}% or
          under a 20% safety buffer.
        </span>
      </div>

      {/* Return Journey Inputs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-[#FFFFFF]/80">
            Return Duration (hours)
          </span>
          <input
            type="number"
            min={0}
            max={24}
            step={0.25}
            value={returnProfile.returnDurationHours}
            onChange={(e) =>
              onUpdateReturnField('returnDurationHours', e.target.value)
            }
            className="w-full rounded border border-[#2F96F5]/50 bg-[#07173F] px-2.5 py-1.5 font-mono text-xs tabular-nums text-[#FFFFFF] focus:border-[#2F96F5] focus:outline-none"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-[#FFFFFF]/80">
            Return O2 Rate (units/hr)
          </span>
          <input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={returnProfile.oxygenRatePerHour}
            onChange={(e) =>
              onUpdateReturnField('oxygenRatePerHour', e.target.value)
            }
            className="w-full rounded border border-[#2F96F5]/50 bg-[#07173F] px-2.5 py-1.5 font-mono text-xs tabular-nums text-[#FFFFFF] focus:border-[#2F96F5] focus:outline-none"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-[#FFFFFF]/80">
            Return Battery Rate (%/hr)
          </span>
          <input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={returnProfile.batteryRatePerHour}
            onChange={(e) =>
              onUpdateReturnField('batteryRatePerHour', e.target.value)
            }
            className="w-full rounded border border-[#2F96F5]/50 bg-[#07173F] px-2.5 py-1.5 font-mono text-xs tabular-nums text-[#FFFFFF] focus:border-[#2F96F5] focus:outline-none"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-[#FFFFFF]/80">
            Return Cooling Rate (%/hr)
          </span>
          <input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={returnProfile.coolingRatePerHour}
            onChange={(e) =>
              onUpdateReturnField('coolingRatePerHour', e.target.value)
            }
            className="w-full rounded border border-[#2F96F5]/50 bg-[#07173F] px-2.5 py-1.5 font-mono text-xs tabular-nums text-[#FFFFFF] focus:border-[#2F96F5] focus:outline-none"
          />
        </label>
      </div>

      {/* Overall Return Feasibility Result + Limiting Resource Explanation */}
      <div
        className={`rounded-md border p-3.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${overallVis.containerClass}`}
        role="status"
        aria-live="polite"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <OverallIcon
              className={`h-5 w-5 shrink-0 ${overallVis.iconClass}`}
              aria-hidden="true"
            />
            <span className={`text-sm font-semibold tracking-wide ${overallVis.labelClass}`}>
              {feasibility.overallResult}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-[#FFFFFF]/85">
            {feasibility.explanation}
          </p>
        </div>

        <div className="shrink-0 border-t border-[#0042A6]/70 pt-2 sm:border-t-0 sm:border-l sm:pl-4 sm:pt-0">
          <div className="text-[11px] text-[#FFFFFF]/65">Limiting Resource</div>
          <div className="text-xs font-semibold text-[#EAFE07]">
            {feasibility.limitingResource.label}
          </div>
          <div className="font-mono text-[11px] tabular-nums text-[#FFFFFF]/80">
            Max return:{' '}
            {feasibility.limitingResource.maxReturnHours !== null
              ? `${feasibility.limitingResource.maxReturnHours.toFixed(2)} hrs`
              : 'N/A'}
          </div>
        </div>
      </div>

      {/* Resource-by-Resource Requirement vs Remaining Comparison */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {comparisonList.map((item) => {
          const vis = getResourceFeasibilityVisual(item.status);
          const StatusIcon = vis.Icon;
          const isLimiting = item.id === feasibility.limitingResource.id;
          const marginPrefix = item.margin >= 0 ? '+' : '−';
          const absMargin = Math.abs(item.margin);

          return (
            <div
              key={item.id}
              className={`rounded border bg-[#07173F] p-3 space-y-2 ${vis.borderClass}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#FFFFFF] truncate">
                  {item.label}
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-semibold shrink-0 whitespace-nowrap ${vis.badgeClass}`}
                >
                  <StatusIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{item.status}</span>
                </span>
              </div>

              <dl className="space-y-1 text-[11px]">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-[#FFFFFF]/65">Current Remaining</dt>
                  <dd className="font-mono tabular-nums text-[#FFFFFF]">
                    {formatAmount(item.remaining, item.unit)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-[#FFFFFF]/65">Return Required</dt>
                  <dd className="font-mono tabular-nums text-[#2F96F5]">
                    {formatAmount(item.required, item.unit)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-[#0042A6]/70 pt-1">
                  <dt className="text-[#FFFFFF]/65">Net Reserve / Deficit</dt>
                  <dd
                    className={`font-mono font-semibold tabular-nums ${
                      item.status === 'Insufficient'
                        ? 'text-[#E43700]'
                        : item.status === 'Warning'
                          ? 'text-[#EAFE07]'
                          : 'text-[#2F96F5]'
                    }`}
                  >
                    {marginPrefix}
                    {formatAmount(absMargin, item.unit)}
                  </dd>
                </div>
              </dl>

              <div className="flex items-center justify-between border-t border-[#0042A6]/45 pt-1.5 text-[10px]">
                <span className="font-mono tabular-nums text-[#FFFFFF]/65">
                  Max return:{' '}
                  {item.maxReturnHours !== null
                    ? `${item.maxReturnHours.toFixed(2)}h`
                    : 'N/A'}
                </span>
                {isLimiting && (
                  <span className="inline-flex items-center gap-1 font-medium text-[#EAFE07]">
                    <ArrowLeftRight className="h-3 w-3" aria-hidden="true" />
                    <span>Limiting</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
