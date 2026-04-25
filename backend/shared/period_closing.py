from __future__ import annotations

from calendar import monthrange
from datetime import date, datetime
import re
from typing import Any

from rest_framework.exceptions import ValidationError

ISO_DATE_PATTERN = re.compile(r'^\d{4}-\d{2}-\d{2}$')


def get_latest_closed_period_end(company: str | None):
    if not company:
        return None

    from procurement.models import GlPeriodClosing

    latest_closing = (
        GlPeriodClosing.objects
        .filter(
            company=company,
            status=GlPeriodClosing.STATUS_APPROVED,
        )
        .order_by('-year', '-month', '-id')
        .first()
    )

    if not latest_closing:
        return None

    return date(
        latest_closing.year,
        latest_closing.month,
        monthrange(latest_closing.year, latest_closing.month)[1],
    )


def is_date_in_closed_period(value: date, company: str | None):
    latest_closed_period_end = get_latest_closed_period_end(company)

    if not latest_closed_period_end:
        return False

    return value <= latest_closed_period_end


def validate_date_in_open_period(
    value: date | None,
    company: str | None,
    field_label: str = 'Date',
):
    if not value or not company:
        return

    latest_closed_period_end = get_latest_closed_period_end(company)

    if latest_closed_period_end and value <= latest_closed_period_end:
        raise ValidationError(
            {
                field_label: (
                    f'{field_label} falls in a closed GL period. '
                    f'Use a date after {latest_closed_period_end.isoformat()}.'
                )
            }
        )


def validate_month_in_open_period(
    year: int | None,
    month: int | None,
    company: str | None,
    field_label: str = 'Period',
):
    if not year or not month or not company:
        return

    period_end = date(year, month, monthrange(year, month)[1])
    validate_date_in_open_period(period_end, company, field_label)


def ensure_request_dates_in_open_period(payload: Any, company: str | None):
    if not company:
        return

    latest_closed_period_end = get_latest_closed_period_end(company)

    if not latest_closed_period_end:
        return

    errors = _collect_closed_period_errors(payload, latest_closed_period_end)

    if errors:
        raise ValidationError(errors)


def _collect_closed_period_errors(
    payload: Any,
    latest_closed_period_end: date,
    path: str = '',
) -> dict[str, str]:
    errors: dict[str, str] = {}

    if isinstance(payload, dict):
        for key, value in payload.items():
            nested_path = f'{path}.{key}' if path else str(key)
            errors.update(
                _collect_closed_period_errors(
                    value,
                    latest_closed_period_end,
                    nested_path,
                )
            )
        return errors

    if isinstance(payload, list):
        for index, value in enumerate(payload):
            nested_path = f'{path}[{index}]'
            errors.update(
                _collect_closed_period_errors(
                    value,
                    latest_closed_period_end,
                    nested_path,
                )
            )
        return errors

    if not isinstance(payload, str) or not ISO_DATE_PATTERN.match(payload):
        return errors

    try:
        parsed_date = datetime.strptime(payload, '%Y-%m-%d').date()
    except ValueError:
        return errors

    if parsed_date <= latest_closed_period_end:
        field_label = path or 'date'
        errors[field_label] = (
            f'{field_label} falls in a closed GL period. '
            f'Use a date after {latest_closed_period_end.isoformat()}.'
        )

    return errors
