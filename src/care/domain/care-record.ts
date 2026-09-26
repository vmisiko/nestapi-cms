export enum CareRecordType {
  VISIT = 'visit',
  CALL = 'call',
  HOSPITAL = 'hospital',
  BEREAVEMENT = 'bereavement',
  FINANCIAL_NEED = 'financial_need',
  OTHER = 'other',
}

export enum CareRecordStatus {
  OPEN = 'open',
  RESOLVED = 'resolved',
}

export interface CareRecord {
  id: string;
  memberId: string;
  type: CareRecordType;
  notes: string | null;
  handledBy: string | null;
  status: CareRecordStatus;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
}
