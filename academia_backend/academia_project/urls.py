
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from django.views.generic import TemplateView
from django.views.static import serve as static_serve

from academia import views as academia_views

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # URLs da API
    path('api/', include('academia.urls')),
    
    # URLs para servir as páginas HTML do frontend do usuário
    path('', TemplateView.as_view(template_name='html/home.html'), name='home'),
    path('login/', academia_views.login_view, name='login'),
    path('logout/', academia_views.logout_view, name='logout'),
    path('portal/', academia_views.AlunoPortalPage.as_view(), name='portal'),
    path('portal/admin/', academia_views.AdminDashboardPage.as_view(), name='portal_admin_dashboard'),
    path('portal/professor/', academia_views.ProfessorDashboardPage.as_view(), name='portal_professor_dashboard'),
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

