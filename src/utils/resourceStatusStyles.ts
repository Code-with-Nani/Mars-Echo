import type React from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import type { ResourceStatus } from './resourceCalculator';

export interface ResourceStatusStyle {
  status: ResourceStatus;
  hex: string;
  textClass: string;
  barClass: string;
  borderClass: string;
  labelContainerClass: string;
  Icon: React.ComponentType<{ className?: string }>;
}

export function getResourceStatusStyle(
  status: ResourceStatus
): ResourceStatusStyle {
  switch (status) {
    case 'Normal':
      return {
        status,
        hex: '#2F96F5', // Blue Yonder
        textClass: 'text-[#2F96F5]',
        barClass: 'bg-[#2F96F5]',
        borderClass: 'border-[#0042A6]',
        labelContainerClass: 'text-[#2F96F5]',
        Icon: CheckCircle2,
      };
    case 'Warning':
      return {
        status,
        hex: '#EAFE07', // Neon Yellow
        textClass: 'text-[#EAFE07]',
        barClass: 'bg-[#EAFE07]',
        borderClass: 'border-[#EAFE07]/60',
        labelContainerClass: 'text-[#EAFE07]',
        Icon: AlertTriangle,
      };
    case 'Critical':
      return {
        status,
        hex: '#E43700', // Rocket Red
        textClass: 'text-[#E43700]',
        barClass: 'bg-[#E43700]',
        borderClass: 'border-[#E43700]',
        labelContainerClass: 'text-[#E43700]',
        Icon: AlertOctagon,
      };
    case 'Depleted':
      return {
        status,
        hex: '#8E1100', // Martian Red
        textClass: 'text-[#FFFFFF]',
        barClass: 'bg-[#8E1100]',
        borderClass: 'border-[#8E1100]',
        labelContainerClass:
          'rounded bg-[#8E1100] px-1.5 py-0.5 text-[#FFFFFF] border border-[#E43700]/70',
        Icon: XCircle,
      };
  }
}
