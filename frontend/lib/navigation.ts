export const navigation = [
    {
      title: 'Main',
      items: [
        { label: 'Dashboard', href: '/dashboard', roles: ['admin', 'user'] },
      ],
    },
    {
      title: 'Administration',
      items: [
        { label: 'Master Data', href: '/master-data', roles: ['admin'] },
      ],
    },
    {
      title: 'Employees',
      items: [
        { label: 'Overview', href: '/employees', roles: ['user'] },
        { label: 'Add Work Entry', href: '/employees/add-work-entry', roles: ['user'] },
        { label: 'Update Hours', href: '/employees/update-hours', roles: ['user'] },
        { label: 'View Labour Status', href: '/employees/view-labour-status', roles: ['admin', 'user'] },
      ],
    },
    {
      title: 'Production',
      items: [
        { label: 'Overview', href: '/production', roles: ['user'] },
        { label: 'Add Production Entry', href: '/production/add-production-entry', roles: ['user'] },
        { label: 'Delivery Entry', href: '/production/delivery-entry', roles: ['user'] },
        { label: 'View Production Status', href: '/production/view-production-status', roles: ['admin', 'user'] },
      ],
    },
    {
      title: 'Reports',
      items: [
        { label: 'Overview', href: '/reports', roles: ['admin', 'user'] },
        { label: 'Analytics', href: '/reports/analytics', roles: ['admin', 'user'] },
        { label: 'MH Cost Allocation', href: '/reports/mh-cost-allocation', roles: ['admin', 'user'] },
      ],
    },
  ]
  