from rest_framework import serializers
from rest_framework.exceptions import ValidationError

COMPANY_AKR = 'AKR'
COMPANY_ARM = 'ARM'
COMPANY_DEFAULT = COMPANY_AKR

COMPANY_CHOICES = (
    (COMPANY_AKR, COMPANY_AKR),
    (COMPANY_ARM, COMPANY_ARM),
)


def normalize_company(value):
    normalized = str(value or '').strip().upper()

    return normalized if normalized in {COMPANY_AKR, COMPANY_ARM} else ''


def get_company_from_request(request, required=True):
    company = normalize_company(
        request.headers.get('X-Company') or request.query_params.get('company')
    )

    if required and not company:
        raise ValidationError({'company': 'Select AKR or ARM first.'})

    return company


class CurrentCompanyDefault:
    requires_context = True

    def __call__(self, serializer_field):
        company = serializer_field.context.get('company')

        if company:
            return company

        request = serializer_field.context.get('request')

        if request is not None:
            company = normalize_company(request.headers.get('X-Company'))

        if not company:
            raise serializers.ValidationError('Company is required.')

        return company

    def __repr__(self):
        return 'CurrentCompanyDefault()'
