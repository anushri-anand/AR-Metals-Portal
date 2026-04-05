from django.contrib import admin
from .models import ProductionEntry, DeliveryEntry


admin.site.register(ProductionEntry)
admin.site.register(DeliveryEntry)
