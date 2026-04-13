from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/accounts/', include('accounts.urls')),
    path('api/employees/', include('employees.urls')),
    path('api/procurement/', include('procurement.urls')),
    path('api/production/', include('production.urls')),
    path('api/estimation/', include('estimation.urls')),
]
