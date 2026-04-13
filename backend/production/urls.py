from django.urls import path

from .views import (
    ProjectDetailEntryAPIView,
    ProjectDetailListAPIView,
    ProjectDetailUpdateAPIView,
    ProjectOptionsAPIView,
)

urlpatterns = [
    path('project-details/options/', ProjectOptionsAPIView.as_view(), name='project-options'),
    path('project-details/entry/', ProjectDetailEntryAPIView.as_view(), name='project-detail-entry'),
    path('project-details/update/', ProjectDetailUpdateAPIView.as_view(), name='project-detail-update'),
    path('project-details/', ProjectDetailListAPIView.as_view(), name='project-detail-list'),
]
