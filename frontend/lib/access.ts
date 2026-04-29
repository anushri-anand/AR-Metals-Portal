export const appRoles = [
  'accountant',
  'production_assistant',
  'estimator',
  'qs',
  'manager',
  'admin',
] as const

export type AppRole = (typeof appRoles)[number]

const roleLabels: Record<AppRole, string> = {
  accountant: 'Accountant',
  production_assistant: 'Production Assistant',
  estimator: 'Estimator',
  qs: 'QS',
  manager: 'Manager',
  admin: 'Admin',
}

const legacyRoleMap: Record<string, AppRole> = {
  user_1: 'manager',
  user_2: 'production_assistant',
}

const routeRules: Array<{ prefix: string; roles: AppRole[] }> = [
  { prefix: '/reports/pcr', roles: ['admin'] },
  { prefix: '/reports/bur', roles: ['admin'] },
  {
    prefix: '/reports/cashflow',
    roles: ['accountant', 'manager', 'admin'],
  },
  {
    prefix: '/reports/cost-ledger',
    roles: ['accountant', 'manager', 'admin'],
  },
  {
    prefix: '/reports/vat',
    roles: ['accountant', 'manager', 'admin'],
  },
  {
    prefix: '/reports/corporate-tax',
    roles: ['accountant', 'manager', 'admin'],
  },
  {
    prefix: '/reports/soa',
    roles: ['accountant', 'manager', 'admin'],
  },
  {
    prefix: '/reports/gl-period-closing',
    roles: ['accountant', 'manager', 'admin'],
  },
  { prefix: '/contract/variation-costing', roles: ['estimator', 'manager', 'admin'] },
  { prefix: '/contract/variation-log', roles: ['qs', 'manager', 'admin'] },
  { prefix: '/contract/payment-log', roles: ['accountant', 'qs', 'manager', 'admin'] },
  { prefix: '/contract/revenue', roles: ['manager', 'admin'] },
  { prefix: '/contract', roles: ['accountant', 'estimator', 'qs', 'manager', 'admin'] },
  {
    prefix: '/estimation/client-data',
    roles: ['production_assistant', 'estimator', 'manager', 'admin'],
  },
  {
    prefix: '/estimation/tender-log',
    roles: ['production_assistant', 'estimator', 'manager', 'admin'],
  },
  { prefix: '/estimation', roles: ['production_assistant', 'estimator', 'manager', 'admin'] },
  { prefix: '/employee', roles: ['accountant', 'manager', 'admin'] },
  { prefix: '/procurement', roles: ['accountant', 'manager', 'admin'] },
  { prefix: '/production', roles: ['production_assistant', 'manager', 'admin'] },
  { prefix: '/reports', roles: ['accountant', 'manager', 'admin'] },
  { prefix: '/dashboard', roles: ['admin'] },
]

function matchesPath(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export function normalizeRole(role: string | null | undefined): AppRole | '' {
  const normalizedRole = legacyRoleMap[role || ''] || role || ''
  return appRoles.includes(normalizedRole as AppRole) ? (normalizedRole as AppRole) : ''
}

export function getRoleLabel(role: string | null | undefined) {
  const normalizedRole = normalizeRole(role)
  return normalizedRole ? roleLabels[normalizedRole] : role || ''
}

export function hasRoleAccess(
  role: string | null | undefined,
  allowedRoles: AppRole[]
) {
  const normalizedRole = normalizeRole(role)
  return Boolean(normalizedRole && allowedRoles.includes(normalizedRole))
}

export function canAccessPath(role: string | null | undefined, pathname: string) {
  const normalizedRole = normalizeRole(role)

  if (!normalizedRole) {
    return false
  }

  const matchingRule = routeRules.find((rule) => matchesPath(pathname, rule.prefix))
  return matchingRule ? matchingRule.roles.includes(normalizedRole) : true
}

export function getDefaultPathForRole(role: string | null | undefined) {
  const normalizedRole = normalizeRole(role)

  switch (normalizedRole) {
    case 'accountant':
      return '/employee'
    case 'production_assistant':
      return '/production'
    case 'estimator':
      return '/estimation'
    case 'qs':
      return '/contract'
    case 'manager':
      return '/employee'
    case 'admin':
    default:
      return '/dashboard'
  }
}
