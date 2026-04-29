ROLE_ACCOUNTANT = 'accountant'
ROLE_PRODUCTION_ASSISTANT = 'production_assistant'
ROLE_ESTIMATOR = 'estimator'
ROLE_QS = 'qs'
ROLE_MANAGER = 'manager'
ROLE_ADMIN = 'admin'

ROLE_CHOICES = (
    (ROLE_ACCOUNTANT, 'Accountant'),
    (ROLE_PRODUCTION_ASSISTANT, 'Production Assistant'),
    (ROLE_ESTIMATOR, 'Estimator'),
    (ROLE_QS, 'QS'),
    (ROLE_MANAGER, 'Manager'),
    (ROLE_ADMIN, 'Admin'),
)

LEGACY_ROLE_MAP = {
    'user_1': ROLE_MANAGER,
    'user_2': ROLE_PRODUCTION_ASSISTANT,
}


def normalize_role(role):
    return LEGACY_ROLE_MAP.get(role, role or '')


def get_user_role(user):
    if getattr(user, 'is_superuser', False):
        return ROLE_ADMIN
    return normalize_role(getattr(user, 'role', ''))


def is_manager_or_admin(role):
    normalized_role = normalize_role(role)
    return normalized_role in {ROLE_MANAGER, ROLE_ADMIN}
