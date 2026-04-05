from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView


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
            'role': request.user.role,
        })
