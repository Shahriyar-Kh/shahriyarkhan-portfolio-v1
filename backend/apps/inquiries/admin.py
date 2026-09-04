from django.contrib import admin

from .models import ContactMessage, ServiceRequest


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ("sender_name", "email", "subject", "status", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("sender_name", "email", "subject", "message")


@admin.register(ServiceRequest)
class ServiceRequestAdmin(admin.ModelAdmin):
    list_display = ("sender_name", "email", "subject", "service", "status", "created_at")
    list_filter = ("status", "service", "created_at")
    search_fields = ("sender_name", "email", "subject", "message", "service_type_text")
