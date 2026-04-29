from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .roles import get_user_role


class MeAPIView(APIView):
    def get(self, request):
        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Not authenticated.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        return Response({
            'id': request.user.id,
            'username': request.user.username,
            'role': get_user_role(request.user),
        })
