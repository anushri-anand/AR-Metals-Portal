from rest_framework.permissions import BasePermission, SAFE_METHODS

from .roles import (
    ROLE_ACCOUNTANT,
    ROLE_ADMIN,
    ROLE_ESTIMATOR,
    ROLE_MANAGER,
    ROLE_PRODUCTION_ASSISTANT,
    ROLE_QS,
    get_user_role,
)


READ_ONLY_API_RULES = (
    (
        '/api/estimation/client-data/',
        {
            ROLE_ACCOUNTANT,
        },
    ),
    (
        '/api/estimation/tender-log/',
        {
            ROLE_ACCOUNTANT,
        },
    ),
    (
        '/api/estimation/contract/payment-log/',
        {
            ROLE_ACCOUNTANT,
        },
    ),
    (
        '/api/production/project-details/options/',
        {
            ROLE_ACCOUNTANT,
            ROLE_PRODUCTION_ASSISTANT,
            ROLE_ESTIMATOR,
            ROLE_QS,
            ROLE_MANAGER,
            ROLE_ADMIN,
        },
    ),
    (
        '/api/production/project-details/tender-options/',
        {
            ROLE_ESTIMATOR,
            ROLE_QS,
            ROLE_MANAGER,
            ROLE_ADMIN,
        },
    ),
    (
        '/api/estimation/contract/variation-log/',
        {
            ROLE_ESTIMATOR,
        },
    ),
    (
        '/api/production/time-allocation/',
        {
            ROLE_ACCOUNTANT,
        },
    ),
)

FULL_API_RULES = (
    (
        '/api/employees/',
        {
            ROLE_ACCOUNTANT,
        },
    ),
    (
        '/api/procurement/',
        {
            ROLE_ACCOUNTANT,
        },
    ),
    (
        '/api/production/contract-options/',
        {
            ROLE_PRODUCTION_ASSISTANT,
        },
    ),
    (
        '/api/production/time-allocation/',
        {
            ROLE_PRODUCTION_ASSISTANT,
        },
    ),
    (
        '/api/production/status/',
        {
            ROLE_PRODUCTION_ASSISTANT,
        },
    ),
    (
        '/api/estimation/client-data/',
        {
            ROLE_PRODUCTION_ASSISTANT,
            ROLE_ESTIMATOR,
        },
    ),
    (
        '/api/estimation/tender-log/',
        {
            ROLE_PRODUCTION_ASSISTANT,
            ROLE_ESTIMATOR,
        },
    ),
    (
        '/api/estimation/contract/revenue/',
        {
            ROLE_MANAGER,
            ROLE_ADMIN,
        },
    ),
    (
        '/api/estimation/contract/payment-log/',
        {
            ROLE_ACCOUNTANT,
            ROLE_QS,
        },
    ),
    (
        '/api/estimation/contract/variation-log/',
        {
            ROLE_QS,
        },
    ),
    (
        '/api/estimation/master-list/',
        {
            ROLE_ESTIMATOR,
        },
    ),
    (
        '/api/estimation/boq-items/',
        {
            ROLE_ESTIMATOR,
        },
    ),
    (
        '/api/estimation/costings/',
        {
            ROLE_ESTIMATOR,
        },
    ),
    (
        '/api/estimation/costing-snapshots/',
        {
            ROLE_ESTIMATOR,
        },
    ),
    (
        '/api/estimation/bomal/',
        {
            ROLE_ESTIMATOR,
        },
    ),
)

PUBLIC_ACCOUNT_PATHS = (
    '/api/accounts/login/',
    '/api/accounts/refresh/',
)

AUTHENTICATED_ACCOUNT_PATHS = (
    '/api/accounts/me/',
)


class ApiRoleAccessPermission(BasePermission):
    def has_permission(self, request, view):
        if request.method == 'OPTIONS':
            return True

        path = request.path

        if any(path.startswith(prefix) for prefix in PUBLIC_ACCOUNT_PATHS):
            return True

        if not request.user or not request.user.is_authenticated:
            return False

        role = get_user_role(request.user)

        if any(path.startswith(prefix) for prefix in AUTHENTICATED_ACCOUNT_PATHS):
            return bool(role)

        if role in {ROLE_MANAGER, ROLE_ADMIN}:
            return True

        for prefix, allowed_roles in FULL_API_RULES:
            if path.startswith(prefix):
                return role in allowed_roles

        for prefix, allowed_roles in READ_ONLY_API_RULES:
            if path.startswith(prefix):
                return request.method in SAFE_METHODS and role in allowed_roles

        return False
