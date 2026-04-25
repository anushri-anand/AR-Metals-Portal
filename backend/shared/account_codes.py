FOH_ACCOUNT_CODE_OPTIONS = [
    'Staff Cost',
    'Electricity & Water',
    'Vehicle Running Expenses',
    'Salik, Gate Pass, Parking, Fines',
    'Vehicle Depreciation',
    'Vehicle Rent',
    'Office Furniture Depreciation',
    'Office Equipment',
    'Mobile, Telephone & Internet Expenses',
    'Safety Equipment',
    'Warehouse Rent',
    'Warehouse Expenses',
    'Machinery Depreciation',
    'Repair & Maintenance',
    'Stationery & Printing',
    'License Renewal',
    'Legal & Professional Fee',
    'Marketing & Advertising',
    'Govt Fees',
    'Pantry Expenses',
    'Travel Expenses',
    'Bank Charges',
    'Loading & Unloading Charges',
    'Post & Courier',
    'Small tools & Machineries',
    'Miscellaneous',
]

FOH_ACCOUNT_CODE_SET = set(FOH_ACCOUNT_CODE_OPTIONS)


def is_foh_cost_code(cost_code):
    return str(cost_code or '').strip() == 'FOH'


def normalize_account_code_for_cost_code(cost_code, account_code):
    trimmed_cost_code = str(cost_code or '').strip()
    trimmed_account_code = str(account_code or '').strip()

    if not trimmed_cost_code:
        return trimmed_account_code

    if is_foh_cost_code(trimmed_cost_code):
        if not trimmed_account_code:
            raise ValueError('Account Code is required when Cost Code is FOH.')

        if trimmed_account_code not in FOH_ACCOUNT_CODE_SET:
            raise ValueError('Select a valid FOH Account Code.')

        return trimmed_account_code

    return trimmed_cost_code
