from django.urls import resolve
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.test import APIRequestFactory, force_authenticate

from .models import ApprovalRequest
from .roles import ROLE_ADMIN, get_user_role

APPROVAL_EXECUTION_HEADER = 'HTTP_X_APPROVAL_EXECUTION'


def is_approval_execution_request(request):
    return str(request.META.get('HTTP_X_APPROVAL_EXECUTION', '')).strip() == '1'


def ensure_admin_user(user, message='Only admin can review approval requests.'):
    if get_user_role(user) != ROLE_ADMIN:
        raise PermissionDenied(message)


def ensure_admin_or_approval_execution(
    request,
    message='This action requires admin approval before it can be saved.',
):
    if is_approval_execution_request(request):
        return

    ensure_admin_user(request.user, message)


def extract_error_message(value):
    if value in (None, '', []):
        return ''

    if isinstance(value, str):
        return value

    if isinstance(value, list):
        return ' '.join(filter(None, [extract_error_message(item) for item in value]))

    if isinstance(value, dict):
        for nested_value in value.values():
            nested_message = extract_error_message(nested_value)
            if nested_message:
                return nested_message

    return str(value)


def execute_approval_api_call(
    *,
    path: str,
    method: str,
    payload,
    company: str,
    acting_user,
):
    factory = APIRequestFactory()
    normalized_method = str(method or 'POST').upper()
    extra = {
        APPROVAL_EXECUTION_HEADER: '1',
    }

    if company:
        extra['HTTP_X_COMPANY'] = company

    request_builder = getattr(factory, normalized_method.lower(), None)

    if not request_builder:
        raise ValidationError({'detail': f'Unsupported approval method: {normalized_method}.'})

    drf_request = request_builder(path, payload or {}, format='json', **extra)
    force_authenticate(drf_request, user=acting_user)
    match = resolve(path)
    response = match.func(drf_request, *match.args, **match.kwargs)

    if getattr(response, 'status_code', 500) >= 400:
        raise ValidationError(
            {'detail': extract_error_message(getattr(response, 'data', None)) or 'Approval execution failed.'}
        )

    return getattr(response, 'data', {})


def execute_approval_request(
    request_record: ApprovalRequest,
    acting_user,
    *,
    action: str = 'approve',
):
    if action == 'reject':
        reject_path = str(request_record.reject_endpoint_path or '').strip()

        if not reject_path:
            return {}

        return execute_approval_api_call(
            path=reject_path,
            method=request_record.reject_method or 'POST',
            payload=request_record.reject_payload or {},
            company=request_record.company,
            acting_user=acting_user,
        )

    return execute_approval_api_call(
        path=request_record.endpoint_path,
        method=request_record.method,
        payload=request_record.payload,
        company=request_record.company,
        acting_user=acting_user,
    )


def upsert_pending_approval_request(
    *,
    title: str,
    request_type: str,
    endpoint_path: str,
    submitted_by,
    company: str = '',
    method: str = 'POST',
    payload=None,
    reject_endpoint_path: str = '',
    reject_method: str = 'POST',
    reject_payload=None,
):
    approval_request = (
        ApprovalRequest.objects.filter(
            request_type=request_type,
            endpoint_path=endpoint_path,
            submitted_by=submitted_by,
            status=ApprovalRequest.STATUS_PENDING,
        )
        .order_by('-id')
        .first()
    )

    if approval_request:
        approval_request.title = title.strip()
        approval_request.method = method
        approval_request.company = (company or '').strip()
        approval_request.payload = payload or {}
        approval_request.reject_endpoint_path = (reject_endpoint_path or '').strip()
        approval_request.reject_method = reject_method
        approval_request.reject_payload = reject_payload or {}
        approval_request.reviewed_by = None
        approval_request.review_comment = ''
        approval_request.response_message = 'Submitted for admin approval.'
        approval_request.result_data = {}
        approval_request.approved_at = None
        approval_request.rejected_at = None
        approval_request.save(
            update_fields=[
                'title',
                'method',
                'company',
                'payload',
                'reject_endpoint_path',
                'reject_method',
                'reject_payload',
                'reviewed_by',
                'review_comment',
                'response_message',
                'result_data',
                'approved_at',
                'rejected_at',
                'updated_at',
            ]
        )
        return approval_request

    return ApprovalRequest.objects.create(
        title=title.strip(),
        request_type=request_type.strip(),
        endpoint_path=endpoint_path.strip(),
        method=method,
        company=(company or '').strip(),
        payload=payload or {},
        reject_endpoint_path=(reject_endpoint_path or '').strip(),
        reject_method=reject_method,
        reject_payload=reject_payload or {},
        submitted_by=submitted_by,
        response_message='Submitted for admin approval.',
    )
