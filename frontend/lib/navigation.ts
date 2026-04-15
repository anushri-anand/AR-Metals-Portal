export type AppRole = 'user_1' | 'user_2' | 'admin'

export type NavigationItem = {
  label: string
  href: string
  roles: AppRole[]
}

export type NavigationSection = {
  title: string
  items: NavigationItem[]
}

export const navigation: NavigationSection[] = [
  {
    title: 'Dashboard',
    items: [
      { label: 'Dashboard', href: '/dashboard', roles: ['user_1', 'user_2', 'admin'] },
    ],
  },
  {
    title: 'Estimation',
    items: [
      {
        label: 'Client Data',
        href: '/estimation/client-data',
        roles: ['user_1', 'admin'],
      },
      {
        label: 'Tender Log',
        href: '/estimation/tender-log',
        roles: ['user_1', 'admin'],
      },
      {
        label: 'Master List',
        href: '/estimation/master-list',
        roles: ['user_1', 'admin'],
      },
      {
        label: 'Costing',
        href: '/estimation/costing',
        roles: ['user_1', 'admin'],
      },
    ],
  },
  {
    title: 'Contract',
    items: [
      {
        label: 'Revenue',
        href: '/estimation/contract/revenue',
        roles: ['user_1', 'admin'],
      },
      {
        label: 'Variation Log',
        href: '/estimation/contract/variation-log',
        roles: ['user_1', 'admin'],
      },
      {
        label: 'Payment Log',
        href: '/estimation/contract/payment-log',
        roles: ['user_1', 'admin'],
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
    ],
  },
  {
    title: 'Production',
    items: [
      {
        label: 'Project Details',
        href: '/production/project-details',
        roles: ['user_2', 'admin'],
      },
      {
        label: 'Time Allocation',
        href: '/production/time-allocation',
        roles: ['user_2', 'admin'],
      },
      {
        label: 'Status',
        href: '/production/status',
        roles: ['user_2', 'admin'],
      },
    ],
  },
  
  {
    title: 'Procurement',
    items: [
      {
        label: 'Vendor Data',
        href: '/procurement/vendor-data',
        roles: ['user_1', 'admin'],
      },
      {
        label: 'Purchase Order',
        href: '/procurement/purchase-order',
        roles: ['user_1', 'admin'],
      },
      {
        label: 'Payment',
        href: '/procurement/payment',
        roles: ['user_1', 'admin'],
      },
      {
        label: 'Cashflow',
        href: '/procurement/cashflow',
        roles: ['user_1', 'admin'],
      },
    ],
  },
]
