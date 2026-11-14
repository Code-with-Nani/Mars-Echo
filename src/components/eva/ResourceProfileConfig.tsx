import React from 'react';
import { Sliders, ChevronDown, ChevronUp } from 'lucide-react';
import type {
  AstronautResourceProfile,
  ResourceThresholds,
} from '../../utils/resourceCalculator';

interface ResourceProfileConfigProps {
  profile: AstronautResourceProfile;
  thresholds: ResourceThresholds;
  normalizedThresholds: ResourceThresholds;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdateProfileField: (
    field: keyof AstronautResourceProfile,
    rawValue: string
  ) => void;
  onUpdateThresholdField: (
    field: keyof ResourceThresholds,
    rawValue: string
  ) => void;
}

export const ResourceProfileConfig: React.FC<ResourceProfileConfigProps> = ({
  profile,
  thresholds,
  normalizedThresholds,
  isExpanded,
  onToggleExpand,
  onUpdateProfileField,
  onUpdateThresholdField,
}) => {
  return (
    <section
      className="rounded-md border border-[#0042A6] bg-[#0042A6]/25"
      aria-label="Astronaut Profile and Threshold Assumptions"
    >
      <button
        type="button"
        onClick={onToggleExpand}
        aria-expanded={isExpanded}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#0042A6]/35 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F96F5]"
      >
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          <Sliders className="h-4 w-4 shrink-0 text-[#2F96F5]" aria-hidden="true" />
          <span className="text-xs font-semibold text-[#FFFFFF]">
            Configure Simulated Profile &amp; Threshold Assumptions
          </span>
          <span className="font-mono text-[11px] text-[#FFFFFF]/65 truncate">
            O2 {profile.startingOxygenPct}% ({profile.oxygenConsumptionPerHour}/hr) · Bat{' '}
            {profile.startingBatteryPct}% ({profile.batteryConsumptionPerHour}%/hr) · Cool{' '}
            {profile.startingCoolingPct}% ({profile.coolingConsumptionPerHour}%/hr) · Window{' '}
            {profile.availableMissionHours}h
          </span>
        </div>

        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#2F96F5] shrink-0">
          <span>{isExpanded ? 'Hide' : 'Edit'}</span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          )}
        </span>
      </button>

      {isExpanded && (
        <div className="grid gap-4 border-t border-[#0042A6] p-4 lg:grid-cols-3">
          {/* Starting Values */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-[#FFFFFF]">
                Starting Resource Values
              </h4>
              <span className="text-[11px] text-[#EAFE07]">Simulated</span>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block space-y-1">
                <span className="text-[11px] text-[#FFFFFF]/75">
                  Starting Oxygen (%)
                </span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={profile.startingOxygenPct}
                  onChange={(e) =>
                    onUpdateProfileField('startingOxygenPct', e.target.value)
                  }
                  className="w-full rounded border border-[#2F96F5]/45 bg-[#07173F] px-2.5 py-1.5 font-mono tabular-nums text-[#FFFFFF] focus:border-[#2F96F5] focus:outline-none"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[11px] text-[#FFFFFF]/75">
                  Starting Battery (%)
                </span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={profile.startingBatteryPct}
                  onChange={(e) =>
                    onUpdateProfileField('startingBatteryPct', e.target.value)
                  }
                  className="w-full rounded border border-[#2F96F5]/45 bg-[#07173F] px-2.5 py-1.5 font-mono tabular-nums text-[#FFFFFF] focus:border-[#2F96F5] focus:outline-none"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[11px] text-[#FFFFFF]/75">
                  Starting Cooling Capacity (%)
                </span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={profile.startingCoolingPct}
                  onChange={(e) =>
                    onUpdateProfileField('startingCoolingPct', e.target.value)
                  }
                  className="w-full rounded border border-[#2F96F5]/45 bg-[#07173F] px-2.5 py-1.5 font-mono tabular-nums text-[#FFFFFF] focus:border-[#2F96F5] focus:outline-none"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[11px] text-[#FFFFFF]/75">
                  Available Mission Time (hours)
                </span>
                <input
                  type="number"
                  min={0.5}
                  max={24}
                  step={0.5}
                  value={profile.availableMissionHours}
                  onChange={(e) =>
                    onUpdateProfileField('availableMissionHours', e.target.value)
                  }
                  className="w-full rounded border border-[#2F96F5]/45 bg-[#07173F] px-2.5 py-1.5 font-mono tabular-nums text-[#FFFFFF] focus:border-[#2F96F5] focus:outline-none"
                />
              </label>
            </div>
          </div>

          {/* Consumption Rates */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-[#FFFFFF]">
                Consumption Rates
              </h4>
              <span className="text-[11px] text-[#EAFE07]">Simulated</span>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block space-y-1">
                <span className="text-[11px] text-[#FFFFFF]/75">
                  Oxygen Consumption Rate (units / hour)
                </span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={profile.oxygenConsumptionPerHour}
                  onChange={(e) =>
                    onUpdateProfileField('oxygenConsumptionPerHour', e.target.value)
                  }
                  className="w-full rounded border border-[#2F96F5]/45 bg-[#07173F] px-2.5 py-1.5 font-mono tabular-nums text-[#FFFFFF] focus:border-[#2F96F5] focus:outline-none"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[11px] text-[#FFFFFF]/75">
                  Battery Consumption Rate (% / hour)
                </span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={profile.batteryConsumptionPerHour}
                  onChange={(e) =>
                    onUpdateProfileField('batteryConsumptionPerHour', e.target.value)
                  }
                  className="w-full rounded border border-[#2F96F5]/45 bg-[#07173F] px-2.5 py-1.5 font-mono tabular-nums text-[#FFFFFF] focus:border-[#2F96F5] focus:outline-none"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[11px] text-[#FFFFFF]/75">
                  Cooling Consumption Rate (% / hour)
                </span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={profile.coolingConsumptionPerHour}
                  onChange={(e) =>
                    onUpdateProfileField('coolingConsumptionPerHour', e.target.value)
                  }
                  className="w-full rounded border border-[#2F96F5]/45 bg-[#07173F] px-2.5 py-1.5 font-mono tabular-nums text-[#FFFFFF] focus:border-[#2F96F5] focus:outline-none"
                />
              </label>
            </div>
          </div>

          {/* Thresholds */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold text-[#FFFFFF]">
              Status Thresholds
            </h4>

            <div className="space-y-2 text-xs">
              <label className="block space-y-1">
                <span className="text-[11px] text-[#FFFFFF]/75">
                  Warning Threshold (&le; % remaining)
                </span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  step={1}
                  value={thresholds.warningPct}
                  onChange={(e) =>
                    onUpdateThresholdField('warningPct', e.target.value)
                  }
                  className="w-full rounded border border-[#2F96F5]/45 bg-[#07173F] px-2.5 py-1.5 font-mono tabular-nums text-[#FFFFFF] focus:border-[#2F96F5] focus:outline-none"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[11px] text-[#FFFFFF]/75">
                  Critical Threshold (&le; % remaining)
                </span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  step={1}
                  value={thresholds.criticalPct}
                  onChange={(e) =>
                    onUpdateThresholdField('criticalPct', e.target.value)
                  }
                  className="w-full rounded border border-[#2F96F5]/45 bg-[#07173F] px-2.5 py-1.5 font-mono tabular-nums text-[#FFFFFF] focus:border-[#2F96F5] focus:outline-none"
                />
              </label>

              <div className="border-t border-[#0042A6] pt-2 space-y-1 text-[11px] text-[#FFFFFF]/75">
                <div className="flex justify-between">
                  <span className="text-[#2F96F5] font-medium">Normal</span>
                  <span className="font-mono tabular-nums">
                    &gt; {normalizedThresholds.warningPct}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#EAFE07] font-medium">Warning</span>
                  <span className="font-mono tabular-nums">
                    {normalizedThresholds.criticalPct + 0.1}% –{' '}
                    {normalizedThresholds.warningPct}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#E43700] font-medium">Critical</span>
                  <span className="font-mono tabular-nums">
                    &gt; 0% – {normalizedThresholds.criticalPct}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="rounded bg-[#8E1100] px-1 text-[#FFFFFF] font-medium">
                    Depleted
                  </span>
                  <span className="font-mono tabular-nums">0%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
