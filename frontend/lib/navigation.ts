import { CompanyName } from '@/lib/company'
import { type AppRole } from '@/lib/access'

export type NavigationItem = {
  label: string
  href: string
  roles: AppRole[]
  company?: CompanyName
}

export type NavigationSection = {
  title: string
  items: NavigationItem[]
}

export const sharedNavigation: NavigationSection[] = [
  {
    title: 'Dashboard',
    items: [
      {
        label: 'Dashboard',
        href: '/dashboard',
        roles: ['admin'],
      },
    ],
  },
  {
    title: 'Approvals',
    items: [
      {
        label: 'Approvals',
        href: '/approvals',
        roles: ['accountant', 'production_assistant', 'estimator', 'qs', 'manager', 'admin'],
      },
    ],
  },
  {
    title: 'Employee',
    items: [
      {
        label: 'Personal Details',
        href: '/employee/personal-details',
        roles: ['accountant', 'manager', 'admin'],
      },
      {
        label: 'Time Sheet',
        href: '/employee/time-sheet',
        roles: ['accountant', 'manager', 'admin'],
      },
      {
        label: 'Salary',
        href: '/employee/salary',
        roles: ['accountant', 'manager', 'admin'],
      },
      {
        label: 'Associated Cost',
        href: '/employee/associated-cost',
        roles: ['accountant', 'manager', 'admin'],
      },
    ],
  },
]

export const companyModuleNavigation: NavigationItem[] = [
  {
    label: 'Estimation',
    href: '/estimation',
    roles: ['production_assistant', 'estimator', 'manager', 'admin'],
  },
  {
    label: 'Contract',
    href: '/contract',
    roles: ['accountant', 'estimator', 'qs', 'manager', 'admin'],
  },
  {
    label: 'Production',
    href: '/production',
    roles: ['production_assistant', 'manager', 'admin'],
  },
  {
    label: 'Procurement',
    href: '/procurement',
    roles: ['accountant', 'manager', 'admin'],
  },
  {
    label: 'Reports',
    href: '/reports',
    roles: ['accountant', 'manager', 'admin'],
  },
]
