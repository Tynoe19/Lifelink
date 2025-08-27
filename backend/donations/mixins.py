from rest_framework import status
from rest_framework.response import Response
from django.core.cache import cache
from .constants import CACHE_TTL

class CacheMixin:
    """
    Mixin for caching view responses
    """
    cache_key = None
    cache_timeout = CACHE_TTL['organ_list']

    def get_cache_key(self):
        if self.cache_key:
            return self.cache_key
        return f"{self.__class__.__name__}_{self.request.user.id}"

    def get_cached_response(self):
        cache_key = self.get_cache_key()
        return cache.get(cache_key)

    def set_cached_response(self, data):
        cache_key = self.get_cache_key()
        cache.set(cache_key, data, self.cache_timeout)

class TransactionMixin:
    """
    Mixin for handling database transactions
    """
    def perform_in_transaction(self, func, *args, **kwargs):
        from django.db import transaction
        try:
            with transaction.atomic():
                return func(*args, **kwargs)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ErrorHandlerMixin:
    """
    Mixin for handling common errors
    """
    def handle_error(self, error, status_code=status.HTTP_400_BAD_REQUEST):
        return Response(
            {'error': str(error)},
            status=status_code
        )

    def handle_validation_error(self, error):
        return Response(
            {'error': 'Validation error', 'details': error},
            status=status.HTTP_400_BAD_REQUEST
        )

    def handle_not_found(self, message='Resource not found'):
        return Response(
            {'error': message},
            status=status.HTTP_404_NOT_FOUND
        )

    def handle_permission_denied(self, message='Permission denied'):
        return Response(
            {'error': message},
            status=status.HTTP_403_FORBIDDEN
        ) 