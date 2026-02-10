export const PERMISSION_ACTIONS = ['create', 'read', 'update', 'delete'] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export interface PermissionModule {
  key: string;
  name: string;
  actions: PermissionAction[];
}

export const PERMISSION_MODULES: PermissionModule[] = [
  { key: 'clients', name: 'Klientlar', actions: ['create', 'read', 'update', 'delete'] },
  { key: 'requests', name: 'Zayavkalar', actions: ['create', 'read', 'update', 'delete'] },
  { key: 'documents', name: 'Hujjatlar', actions: ['create', 'read', 'update', 'delete'] },
  { key: 'invoices', name: 'Fakturalar', actions: ['create', 'read', 'update', 'delete'] },
  { key: 'shipments', name: "Jo'natmalar", actions: ['create', 'read', 'update', 'delete'] },
  { key: 'rate-quotes', name: 'Tariflar', actions: ['create', 'read', 'update', 'delete'] },
  { key: 'issued-codes', name: 'Kodlar', actions: ['create', 'read', 'update', 'delete'] },
  { key: 'internal-documents', name: 'Ichki hujjatlar', actions: ['create', 'read', 'update', 'delete'] },
  { key: 'personnel-documents', name: 'Kadrlar hujjatlari', actions: ['create', 'read', 'update', 'delete'] },
  { key: 'operational-payments', name: "Operatsion to'lovlar", actions: ['create', 'read', 'update', 'delete'] },
  { key: 'email', name: 'Email', actions: ['create', 'read', 'update', 'delete'] },
  { key: 'users', name: 'Foydalanuvchilar', actions: ['create', 'read', 'update', 'delete'] },
  { key: 'archive', name: 'Arxiv', actions: ['read', 'update'] },
];

export const DEFAULT_PERMISSIONS: Record<string, Record<string, PermissionAction[]>> = {
  manager: {
    clients: ['create', 'read', 'update', 'delete'],
    requests: ['create', 'read', 'update', 'delete'],
    documents: ['create', 'read', 'update', 'delete'],
    invoices: ['create', 'read', 'update', 'delete'],
    shipments: ['create', 'read', 'update', 'delete'],
    'rate-quotes': ['create', 'read', 'update', 'delete'],
    'issued-codes': ['create', 'read', 'update', 'delete'],
    'internal-documents': ['create', 'read', 'update', 'delete'],
    'personnel-documents': ['create', 'read', 'update', 'delete'],
    'operational-payments': ['create', 'read', 'update'],
    email: ['create', 'read', 'update', 'delete'],
    archive: ['read', 'update'],
  },
  accountant: {
    documents: ['create', 'read', 'update'],
    invoices: ['create', 'read', 'update'],
    'internal-documents': ['create', 'read', 'update'],
    'personnel-documents': ['create', 'read', 'update'],
    'operational-payments': ['create', 'read', 'update'],
  },
  operator: {
    clients: ['create', 'read', 'update'],
    requests: ['create', 'read', 'update'],
    shipments: ['create', 'read', 'update'],
    'rate-quotes': ['create', 'read', 'update'],
    'issued-codes': ['create', 'read', 'update'],
    email: ['create', 'read', 'update'],
  },
  administrator: {
    clients: ['create', 'read', 'update'],
    requests: ['create', 'read', 'update'],
    shipments: ['create', 'read', 'update'],
    'rate-quotes': ['create', 'read', 'update'],
    'issued-codes': ['create', 'read', 'update'],
    email: ['create', 'read', 'update'],
  },
};
