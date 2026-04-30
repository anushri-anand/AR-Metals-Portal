from rest_framework import serializers

from .models import ApprovalRequest


class ApprovalRequestCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    request_type = serializers.CharField(max_length=100)
    endpoint_path = serializers.CharField(max_length=255)
    method = serializers.ChoiceField(choices=['POST', 'PATCH'])
    reject_endpoint_path = serializers.CharField(
        max_length=255,
        required=False,
        allow_blank=True,
    )
    reject_method = serializers.ChoiceField(
        choices=['POST', 'PATCH'],
        required=False,
        default='POST',
    )
    company = serializers.CharField(max_length=10, required=False, allow_blank=True)
    payload = serializers.JSONField()
    reject_payload = serializers.JSONField(required=False, default=dict)

    def validate_endpoint_path(self, value):
        path = str(value or '').strip()

        if not path.startswith('/api/'):
            raise serializers.ValidationError('Endpoint path must start with /api/.')

        return path

    def validate_reject_endpoint_path(self, value):
        path = str(value or '').strip()

        if path and not path.startswith('/api/'):
            raise serializers.ValidationError('Reject endpoint path must start with /api/.')

        return path


class ApprovalRequestSerializer(serializers.ModelSerializer):
    submitted_by_username = serializers.CharField(source='submitted_by.username', read_only=True)
    reviewed_by_username = serializers.CharField(source='reviewed_by.username', read_only=True)

    class Meta:
        model = ApprovalRequest
        fields = [
            'id',
            'title',
            'request_type',
            'endpoint_path',
            'method',
            'reject_endpoint_path',
            'reject_method',
            'company',
            'payload',
            'reject_payload',
            'status',
            'submitted_by',
            'submitted_by_username',
            'reviewed_by',
            'reviewed_by_username',
            'review_comment',
            'response_message',
            'result_data',
            'approved_at',
            'rejected_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'status',
            'submitted_by',
            'submitted_by_username',
            'reviewed_by',
            'reviewed_by_username',
            'response_message',
            'result_data',
            'approved_at',
            'rejected_at',
            'created_at',
            'updated_at',
        ]


class ApprovalReviewSerializer(serializers.Serializer):
    comment = serializers.CharField(required=False, allow_blank=True)
