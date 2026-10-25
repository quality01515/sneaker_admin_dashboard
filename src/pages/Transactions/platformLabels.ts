import type { ComponentType } from 'react';
import HubIcon from '@mui/icons-material/Hub';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import type { SvgIconProps } from '@mui/material/SvgIcon';

type SvgIconComponent = ComponentType<SvgIconProps>;

export type PlatformLabelItem =
  | { key: string; logo: string }
  | { key: string; icon: SvgIconComponent };

export const PLATFORM_LABELS: PlatformLabelItem[] = [
  { key: 'Raptor Dev', logo: '/raptor_logo.jpg' },
  { key: 'Titan Dev', logo: '/titan_logo.jpg' },
  { key: 'Titan Prod', logo: '/titan_logo.jpg' },
  { key: 'Vanish Admin Dashboard', logo: '/admin_logo.png' },
  { key: 'Axiom Prod', logo: '/axiom_logo.ico' },
  { key: 'swap.vanish.trade', logo: '/swap_logo.png' },
  { key: 'Vanish Core', icon: HubIcon },
  { key: 'Wiewpoint Dev', icon: VisibilityIcon },
  { key: 'Ghost Dev', icon: VisibilityOffIcon },
];

export function getPlatformLabelItem(key: string): PlatformLabelItem | undefined {
  return PLATFORM_LABELS.find((item) => item.key === key);
}

export function platformMenuLabel(key: string): string {
  return key === 'swap.vanish.trade' ? 'Landing' : key;
}
