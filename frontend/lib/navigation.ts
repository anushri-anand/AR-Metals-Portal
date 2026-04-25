import { CompanyName } from '@/lib/company'

export type AppRole = 'user_1' | 'user_2' | 'admin'

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
        roles: ['user_1', 'user_2', 'admin'],
      },
    ],
  },
  {
    title: 'Employee',
    items: [
      {
        label: 'Personal Details',
        href: '/employee/personal-details',
        roles: ['user_1', 'admin'],
      },
      {
        label: 'Time Sheet',
        href: '/employee/time-sheet',
        roles: ['user_1', 'admin'],
      },
      {
        label: 'Salary',
        href: '/employee/salary',
        roles: ['user_1', 'admin'],
      },
      {
        label: 'Associated Cost',
        href: '/employee/associated-cost',
        roles: ['user_1', 'admin'],
      },
    ],
  },
]

export const companyModuleNavigation: NavigationItem[] = [
  {
    label: 'Estimation',
    href: '/estimation',
    roles: ['user_1', 'admin'],
  },
  {
    label: 'Contract',
    href: '/estimation/contract',
    roles: ['user_1', 'admin'],
  },
  {
    label: 'Production',
    href: '/production',
    roles: ['user_2', 'admin'],
  },
  {
    label: 'Procurement',
    href: '/procurement',
    roles: ['user_1', 'admin'],
  },
  {
    label: 'Reports',
    href: '/reports',
    roles: ['user_1', 'admin'],
  },
]
