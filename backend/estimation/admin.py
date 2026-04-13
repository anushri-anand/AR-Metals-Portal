from django.contrib import admin

from .models import (
    BoqItem,
    ClientData,
    EstimateCostLine,
    LabourCostLine,
    MasterListItem,
    TenderLog,
    TenderCosting,
)


admin.site.register(ClientData)
admin.site.register(TenderLog)
admin.site.register(MasterListItem)
admin.site.register(BoqItem)
admin.site.register(TenderCosting)
admin.site.register(EstimateCostLine)
admin.site.register(LabourCostLine)
