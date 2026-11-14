import React from 'react';
import { Activity, Clock, Gauge, ShieldAlert } from 'lucide-react';
import {
  getLowestRemainingResource,
  type MissionResourceReport,
} from '../../utils/resourceCalculator';
import { getResourceStatusStyle } from '../../utils/resourceStatusStyles';

interface MissionResourceSummaryProps {
  report: MissionResourceReport;
}

export const MissionResourceSummary: React.FC<MissionResourceSummaryProps> = ({
  report,
}) => {
  const lowest = getLowestRemainingResource(report);
  const lowestStyle = getResourceStatusStyle(lowest.status);
  const LowestIcon = lowestStyle.Icon;

  const overallStyle = getResourceStatusStyle(report.overallStatus);
  const OverallIcon = overallStyle.Icon;

  const timeStyle = getResourceStatusStyle(report.missionTime.status);

  return (
    <section
      className="rounded-md border border-[#0042A6] bg-[#0042A6]/25 p-4 space-y-3"
      aria-label="Mission Resource Summary"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-[#0042A6]/80 pb-2.5">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[#2F96F5]" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-[#FFFFFF]">
            Mission Resource Summary
          </h3>
        </div>
        <span className="text-[11px] text-[#FFFFFF]/70">
          Derived directly from active EVA resource calculations (simulated assumptions)
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {/* 1. Total Elapsed Mission Time */}
        <div className="rounded border border-[#0042A6] bg-[#07173F] p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] text-[#FFFFFF]/70">
            <Clock className="h-3.5 w-3.5 text-[#2F96F5]" aria-hidden="true" />
            <span>Total Elapsed Time</span>
          </div>
          <div className="font-mono text-xl font-semibold tabular-nums text-[#FFFFFF]">
            {report.elapsedHours.toFixed(2)}{' '}
            <span className="text-xs font-normal text-[#FFFFFF]/70">hrs</span>
          </div>
          <div className="font-mono text-[11px] tabular-nums text-[#FFFFFF]/60">
            Window: {report.missionTime.availableHours.toFixed(1)} hrs total
          </div>
        </div>

        {/* 2. Remaining Mission Time */}
        <div className="rounded border border-[#0042A6] bg-[#07173F] p-3 space-y-1">
          <div className="flex items-center justify-between gap-1 text-[11px] text-[#FFFFFF]/70">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-[#2F96F5]" aria-hidden="true" />
              <span>Remaining Mission Time</span>
            </span>
            <span className={`font-semibold ${timeStyle.labelContainerClass}`}>
              {report.missionTime.status}
            </span>
          </div>
          <div className="font-mono text-xl font-semibold tabular-nums text-[#FFFFFF]">
            {report.missionTime.remainingHours.toFixed(2)}{' '}
            <span className="text-xs font-normal text-[#FFFFFF]/70">hrs</span>
          </div>
          <div className="font-mono text-[11px] tabular-nums text-[#FFFFFF]/60">
            {report.missionTime.percentage.toFixed(1)}% of mission window left
          </div>
        </div>

        {/* 3. Lowest Remaining Resource */}
        <div className="rounded border border-[#0042A6] bg-[#07173F] p-3 space-y-1">
          <div className="flex items-center justify-between gap-1 text-[11px] text-[#FFFFFF]/70">
            <span className="flex items-center gap-1.5">
              <Gauge className="h-3.5 w-3.5 text-[#EAFE07]" aria-hidden="true" />
              <span>Lowest Remaining Resource</span>
            </span>
            <span
              className={`inline-flex items-center gap-1 font-semibold ${lowestStyle.labelContainerClass}`}
            >
              <LowestIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span>{lowest.status}</span>
            </span>
          </div>
          <div className="text-base font-semibold text-[#FFFFFF] truncate" title={lowest.label}>
            {lowest.label}
          </div>
          <div className="font-mono text-[11px] tabular-nums text-[#FFFFFF]/75">
            {lowest.remainingDisplay} ({lowest.percentage.toFixed(1)}%)
          </div>
        </div>

        {/* 4. Current Overall Resource Condition */}
        <div
          className={`rounded border bg-[#07173F] p-3 space-y-1 ${overallStyle.borderClass}`}
        >
          <div className="flex items-center gap-1.5 text-[11px] text-[#FFFFFF]/70">
            <ShieldAlert
              className="h-3.5 w-3.5 text-[#2F96F5]"
              aria-hidden="true"
            />
            <span>Overall Resource Condition</span>
          </div>
          <div className="flex items-center gap-2 pt-0.5">
            <span
              className={`inline-flex items-center gap-1.5 text-lg font-semibold ${overallStyle.labelContainerClass}`}
            >
              <OverallIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{report.overallStatus}</span>
            </span>
          </div>
          <div className="text-[11px] text-[#FFFFFF]/65">
            Derived from worst individual resource state
          </div>
        </div>
      </div>
    </section>
  );
};
