export const modules = [
  { id: 'dashboard', label: 'Overview', description: 'Resort performance and daily operations' },
  { id: 'reservations', label: 'Reservations & Calendar', description: '17-room availability, bookings and maintenance' },
  { id: 'crm', label: 'CRM & Enquiries', description: 'Guest leads, follow-ups and guest history' },
  { id: 'quotes', label: 'Quote Builder', description: 'Stay quotations, revisions and confirmations' },
  { id: 'pos', label: 'Restaurant POS & KOT', description: 'Menu, kitchen tickets, bills and folios' },
  { id: 'hr', label: 'HR & Payroll', description: 'Employees, attendance, leave and payroll' },
  { id: 'stores', label: 'Stores & Assets', description: 'Stock, procurement, issues and assets' },
  { id: 'reports', label: 'Reports', description: 'Occupancy, revenue and operational reports' }
] as const
export type ModuleId = typeof modules[number]['id']