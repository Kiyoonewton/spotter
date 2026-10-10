from uuid import uuid4

from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(["GET"])
def health(request):
    response = Response({"status": "ok"})
    response["X-Request-ID"] = str(uuid4())
    return response
