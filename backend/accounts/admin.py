from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import ApprovalRequest, User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    model = User

    fieldsets = UserAdmin.fieldsets + (
        ('Custom Fields', {'fields': ('role', 'created_at')}),
    )

    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Custom Fields', {'fields': ('role',)}),
    )

    list_display = ('username', 'email', 'role', 'is_staff', 'is_active')
    readonly_fields = ('created_at',)


@admin.register(ApprovalRequest)
class ApprovalRequestAdmin(admin.ModelAdmin):
    list_display = (
        'title',
        'request_type',
        'status',
        'company',
        'submitted_by',
        'reviewed_by',
        'created_at',
    )
    list_filter = ('status', 'company', 'request_type', 'created_at')
    search_fields = (
        'title',
        'request_type',
        'submitted_by__username',
        'reviewed_by__username',
        'company',
    )
    readonly_fields = ('created_at', 'updated_at', 'approved_at', 'rejected_at')
