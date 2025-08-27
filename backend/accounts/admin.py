from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, RecipientProfile

class RecipientProfileInline(admin.StackedInline):
    model = RecipientProfile
    can_delete = False
    verbose_name_plural = 'Recipient Profile'

class CustomUserAdmin(UserAdmin):
    inlines = (RecipientProfileInline,)
    list_display = ('email', 'first_name', 'last_name', 'user_type', 'is_verified', 'is_active', 'date_joined')
    list_filter = ('user_type', 'is_verified', 'is_active', 'date_joined')
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('-date_joined',)
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'gender', 'date_of_birth', 'blood_type', 'avatar')}),
        ('Location', {'fields': ('country', 'city', 'address', 'postal_code', 'latitude', 'longitude')}),
        ('Medical Info', {'fields': ('weight', 'height')}),
        ('Contact', {'fields': ('phone_number',)}),
        ('Permissions', {'fields': ('user_type', 'is_verified', 'is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2', 'first_name', 'last_name', 'gender', 'date_of_birth', 'blood_type', 'user_type'),
        }),
    )

admin.site.register(CustomUser, CustomUserAdmin)

@admin.register(RecipientProfile)
class RecipientProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'urgency_level')
    search_fields = ('user__fullname', 'user__email')
    list_filter = ('urgency_level',)


