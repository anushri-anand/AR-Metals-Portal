from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .approval_utils import ensure_admin_user, execute_approval_request
from .models import ApprovalRequest
from .roles import ROLE_ADMIN, get_user_role
from .serializers import (
    ApprovalRequestCreateSerializer,
    ApprovalRequestSerializer,
    ApprovalReviewSerializer,
)


class MeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            'id': request.user.id,
            'username': request.user.username,
            'role': get_user_role(request.user),
        })


class ApprovalRequestListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = ApprovalRequest.objects.select_related(
            'submitted_by',
            'reviewed_by',
        )

        if request.query_params.get('scope') == 'admin':
            ensure_admin_user(request.user)
            queryset = queryset.filter(status=ApprovalRequest.STATUS_PENDING)
        else:
            queryset = queryset.filter(submitted_by=request.user)

        serializer = ApprovalRequestSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = ApprovalRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            approval_request = ApprovalRequest.objects.create(
                title=data['title'].strip(),
                request_type=data['request_type'].strip(),
                endpoint_path=data['endpoint_path'].strip(),
                method=data['method'],
                reject_endpoint_path=(data.get('reject_endpoint_path') or '').strip(),
                reject_method=data.get('reject_method') or 'POST',
                company=(data.get('company') or '').strip(),
                payload=data['payload'],
                reject_payload=data.get('reject_payload') or {},
                submitted_by=request.user,
                response_message='Submitted for admin approval.',
            )

            if get_user_role(request.user) == ROLE_ADMIN:
                result_data = execute_approval_request(
                    approval_request,
                    request.user,
                    action='approve',
                )
                approval_request.status = ApprovalRequest.STATUS_APPROVED
                approval_request.reviewed_by = request.user
                approval_request.review_comment = ''
                approval_request.response_message = 'Saved directly by admin.'
                approval_request.result_data = result_data or {}
                approval_request.approved_at = timezone.now()
                approval_request.rejected_at = None
                approval_request.save(
                    update_fields=[
                        'status',
                        'reviewed_by',
                        'review_comment',
                        'response_message',
                        'result_data',
                        'approved_at',
                        'rejected_at',
                        'updated_at',
                    ]
                )

        return Response(
            ApprovalRequestSerializer(approval_request).data,
            status=status.HTTP_201_CREATED,
        )


class ApprovalRequestApproveAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        ensure_admin_user(request.user)
        approval_request = ApprovalRequest.objects.select_related('submitted_by').get(pk=pk)

        if approval_request.status != ApprovalRequest.STATUS_PENDING:
            raise ValidationError({'detail': 'Only pending requests can be approved.'})

        review_serializer = ApprovalReviewSerializer(data=request.data)
        review_serializer.is_valid(raise_exception=True)
        comment = (review_serializer.validated_data.get('comment') or '').strip()

        result_data = execute_approval_request(approval_request, request.user, action='approve')

        approval_request.status = ApprovalRequest.STATUS_APPROVED
        approval_request.reviewed_by = request.user
        approval_request.review_comment = comment
        approval_request.response_message = (
            f'Approved by {request.user.username}.'
            + (f' {comment}' if comment else '')
        )
        approval_request.result_data = result_data or {}
        approval_request.approved_at = timezone.now()
        approval_request.rejected_at = None
        approval_request.save(
            update_fields=[
                'status',
                'reviewed_by',
                'review_comment',
                'response_message',
                'result_data',
                'approved_at',
                'rejected_at',
                'updated_at',
            ]
        )

        return Response(ApprovalRequestSerializer(approval_request).data)


class ApprovalRequestRejectAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        ensure_admin_user(request.user)
        approval_request = ApprovalRequest.objects.select_related('submitted_by').get(pk=pk)

        if approval_request.status != ApprovalRequest.STATUS_PENDING:
            raise ValidationError({'detail': 'Only pending requests can be rejected.'})

        review_serializer = ApprovalReviewSerializer(data=request.data)
        review_serializer.is_valid(raise_exception=True)
        comment = (review_serializer.validated_data.get('comment') or '').strip()

        approval_request.status = ApprovalRequest.STATUS_REJECTED
        approval_request.reviewed_by = request.user
        approval_request.review_comment = comment
        approval_request.response_message = (
            f'Rejected by {request.user.username}.'
            + (f' {comment}' if comment else '')
        )
        approval_request.result_data = execute_approval_request(
            approval_request,
            request.user,
            action='reject',
        ) or {}
        approval_request.approved_at = None
        approval_request.rejected_at = timezone.now()
        approval_request.save(
            update_fields=[
                'status',
                'reviewed_by',
                'review_comment',
                'response_message',
                'result_data',
                'approved_at',
                'rejected_at',
                'updated_at',
            ]
        )

        return Response(ApprovalRequestSerializer(approval_request).data)
