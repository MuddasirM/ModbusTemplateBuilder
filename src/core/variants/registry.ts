// Registry of available output variants. Adding a new target (Ignition,
// WebSupervisor, ...) means writing one more bundle and listing it here.

import { argosVariant } from './argos';
import type { VariantBundle } from './types';

export const VARIANTS: VariantBundle[] = [argosVariant];
export const DEFAULT_VARIANT: VariantBundle = argosVariant;
