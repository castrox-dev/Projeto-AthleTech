
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from django.views.static import serve as static_serve

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # URLs da API
    path('api/', include('academia.urls')),
    
    # URLs para servir as páginas HTML do frontend do usuário
    path('', TemplateView.as_view(template_name='html/home.html'), name='home'),
    path('login/', TemplateView.as_view(template_name='html/login.html'), name='login'),
    path('portal/', TemplateView.as_view(template_name='html/portal_frontend.html'), name='portal'),
    path('treinos/', TemplateView.as_view(template_name='html/treinos_frontend.html'), name='treinos'),
    path('planos/', TemplateView.as_view(template_name='html/planos_frontend.html'), name='planos'),
    path('cadastro/', TemplateView.as_view(template_name='html/cadastro_frontend.html'), name='cadastro'),
    path('checkout/', TemplateView.as_view(template_name='html/checkout_frontend.html'), name='checkout'),
    path('robots.txt', static_serve, {'path': 'robots.txt', 'document_root': settings.STATIC_ROOT}),
    path('sitemap.xml', static_serve, {'path': 'sitemap.xml', 'document_root': settings.STATIC_ROOT}),
]

# Servir arquivos estáticos e media em desenvolvimento
if settings.DEBUG:
    from django.contrib.staticfiles.urls import staticfiles_urlpatterns
    urlpatterns += staticfiles_urlpatterns()
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

