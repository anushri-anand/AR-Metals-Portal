from rest_framework.routers import DefaultRouter
from .views import EmployeeViewSet, ProjectViewSet, ProjectItemViewSet

router = DefaultRouter()
router.register(r'employees', EmployeeViewSet)
router.register(r'projects', ProjectViewSet)
router.register(r'project-items', ProjectItemViewSet)

urlpatterns = router.urls
