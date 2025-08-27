from rest_framework import permissions

class IsRecipientOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow recipients to request organs.
    """
    def has_permission(self, request, view):
        # Allow read-only access for all users
        if request.method in permissions.SAFE_METHODS:
            return True
            
        # Only allow recipients to make requests
        return request.user.is_authenticated and request.user.user_type == 'recipient'
        
    def has_object_permission(self, request, view, obj):
        # Allow read-only access for all users
        if request.method in permissions.SAFE_METHODS:
            return True
            
        # Only allow recipients to make requests
        return request.user.is_authenticated and request.user.user_type == 'recipient'

class IsDonorOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow donors to create and modify organs.
    Read-only access for other users.
    """
    def has_permission(self, request, view):
        # Allow read-only access for all users
        if request.method in permissions.SAFE_METHODS:
            return True
            
        # Only allow donors to create/modify organs
        return request.user.is_authenticated and request.user.user_type == 'donor'
        
    def has_object_permission(self, request, view, obj):
        # Allow read-only access for all users
        if request.method in permissions.SAFE_METHODS:
            return True
            
        # Only allow the donor who owns the organ to modify it
        return request.user.is_authenticated and obj.donor == request.user