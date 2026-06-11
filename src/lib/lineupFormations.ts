import type { FormationId } from '../types'

export interface FormationSlotDef {
  key: string
  label: string
  top: number
  left: number
}

export const FORMATION_IDS: FormationId[] = ['4-4-2', '4-3-3', '4-2-3-1', '3-5-2', '5-3-2']

export const FORMATION_SLOTS: Record<FormationId, FormationSlotDef[]> = {
  '4-4-2': [
    { key: 'GK', label: 'GK', top: 88, left: 50 },
    { key: 'LB', label: 'LB', top: 72, left: 14 },
    { key: 'CB1', label: 'CB', top: 72, left: 38 },
    { key: 'CB2', label: 'CB', top: 72, left: 62 },
    { key: 'RB', label: 'RB', top: 72, left: 86 },
    { key: 'LM', label: 'LM', top: 52, left: 14 },
    { key: 'CM1', label: 'CM', top: 52, left: 38 },
    { key: 'CM2', label: 'CM', top: 52, left: 62 },
    { key: 'RM', label: 'RM', top: 52, left: 86 },
    { key: 'ST1', label: 'ST', top: 28, left: 38 },
    { key: 'ST2', label: 'ST', top: 28, left: 62 },
  ],
  '4-3-3': [
    { key: 'GK', label: 'GK', top: 88, left: 50 },
    { key: 'LB', label: 'LB', top: 72, left: 14 },
    { key: 'CB1', label: 'CB', top: 72, left: 38 },
    { key: 'CB2', label: 'CB', top: 72, left: 62 },
    { key: 'RB', label: 'RB', top: 72, left: 86 },
    { key: 'CM1', label: 'CM', top: 52, left: 30 },
    { key: 'CM2', label: 'CM', top: 52, left: 50 },
    { key: 'CM3', label: 'CM', top: 52, left: 70 },
    { key: 'LW', label: 'LW', top: 28, left: 18 },
    { key: 'ST', label: 'ST', top: 28, left: 50 },
    { key: 'RW', label: 'RW', top: 28, left: 82 },
  ],
  '4-2-3-1': [
    { key: 'GK', label: 'GK', top: 88, left: 50 },
    { key: 'LB', label: 'LB', top: 72, left: 14 },
    { key: 'CB1', label: 'CB', top: 72, left: 38 },
    { key: 'CB2', label: 'CB', top: 72, left: 62 },
    { key: 'RB', label: 'RB', top: 72, left: 86 },
    { key: 'CDM1', label: 'CDM', top: 62, left: 38 },
    { key: 'CDM2', label: 'CDM', top: 62, left: 62 },
    { key: 'LW', label: 'LW', top: 42, left: 18 },
    { key: 'AM', label: 'AM', top: 42, left: 50 },
    { key: 'RW', label: 'RW', top: 42, left: 82 },
    { key: 'ST', label: 'ST', top: 26, left: 50 },
  ],
  '3-5-2': [
    { key: 'GK', label: 'GK', top: 88, left: 50 },
    { key: 'CB1', label: 'CB', top: 72, left: 28 },
    { key: 'CB2', label: 'CB', top: 72, left: 50 },
    { key: 'CB3', label: 'CB', top: 72, left: 72 },
    { key: 'LWB', label: 'LWB', top: 58, left: 10 },
    { key: 'CM1', label: 'CM', top: 52, left: 35 },
    { key: 'CM2', label: 'CM', top: 52, left: 50 },
    { key: 'CM3', label: 'CM', top: 52, left: 65 },
    { key: 'RWB', label: 'RWB', top: 58, left: 90 },
    { key: 'ST1', label: 'ST', top: 28, left: 38 },
    { key: 'ST2', label: 'ST', top: 28, left: 62 },
  ],
  '5-3-2': [
    { key: 'GK', label: 'GK', top: 88, left: 50 },
    { key: 'LWB', label: 'LWB', top: 72, left: 8 },
    { key: 'CB1', label: 'CB', top: 72, left: 30 },
    { key: 'CB2', label: 'CB', top: 72, left: 50 },
    { key: 'CB3', label: 'CB', top: 72, left: 70 },
    { key: 'RWB', label: 'RWB', top: 72, left: 92 },
    { key: 'CM1', label: 'CM', top: 52, left: 30 },
    { key: 'CM2', label: 'CM', top: 52, left: 50 },
    { key: 'CM3', label: 'CM', top: 52, left: 70 },
    { key: 'ST1', label: 'ST', top: 28, left: 38 },
    { key: 'ST2', label: 'ST', top: 28, left: 62 },
  ],
}
