import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import {
  Activity,
  BadgeCheck,
  BookOpen,
  Building2,
  ClipboardList,
  Radar,
  ReceiptText,
  Siren,
  Truck,
  Users,
  Wallet,
} from 'lucide-angular';
import { lastValueFrom } from 'rxjs';
import { AuthStore } from '@features/identity/auth/state/auth.store';
import { EmergenciesService } from '@features/emergencies/data-access/emergencies.service';
import { WorkshopsService } from '@features/workshops/data-access/workshops.service';
import { HomeDashboardComponent } from '../../components/home-dashboard/home-dashboard.component';
import { HomeKpi, HomeQuickAction } from '../../models/home-dashboard.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, HomeDashboardComponent],
  template: `
    <app-home-dashboard
      [title]="title()"
      [subtitle]="subtitle()"
      [personaLabel]="roleLabel()"
      [personaSummary]="roleSummary()"
      [statusTitle]="statusTitle()"
      [statusSummary]="statusSummary()"
      [kpis]="kpis()"
      [highlights]="highlights()"
      [incidents]="recentIncidents()"
      [isSyncing]="incidentsQuery.isFetching()"
      [quickActions]="quickActions()"
      (quickActionSelected)="onQuickActionSelected($event)"
    ></app-home-dashboard>
  `,
})
export class HomeComponent {
  private authStore = inject(AuthStore);
  private emergenciesService = inject(EmergenciesService);
  private workshopsService = inject(WorkshopsService);
  private router = inject(Router);

  private currentUser = computed(() => this.authStore.user());
  userRole = computed(() => this.currentUser()?.rol_nombre || 'cliente');
  userContext = computed(() => this.currentUser()?.rol_contexto || '');
  isSuperAdmin = computed(() => this.userRole() === 'superadmin');
  isOwner = computed(() => this.userRole() === 'admin_taller' && this.userContext() === 'owner');
  isBranchAdmin = computed(() => this.userRole() === 'admin_taller' && this.userContext() === 'admin_sucursal');
  isTechnician = computed(() => this.userRole() === 'tecnico');
  isClient = computed(() => this.userRole() === 'cliente');

  roleLabel = computed(() => {
    if (this.isSuperAdmin()) return 'Superadmin';
    if (this.isOwner()) return 'Owner de taller';
    if (this.isBranchAdmin()) return 'Admin de sucursal';
    if (this.isTechnician()) return 'Tecnico de campo';
    if (this.isClient()) return 'Cliente';
    return 'Operacion activa';
  });

  roleSummary = computed(() => {
    if (this.isSuperAdmin()) return 'Vision integral de tenants, talleres e incidentes en tiempo real.';
    if (this.isOwner()) return 'Coordinacion operativa, financiera y de equipo para todo el taller.';
    if (this.isBranchAdmin()) return 'Control diario de la sucursal, citas, incidentes y disponibilidad.';
    if (this.isTechnician()) return 'Seguimiento de servicios, tiempos de respuesta y atencion en campo.';
    if (this.isClient()) return 'Seguimiento claro del servicio, estado del auxilio y trazabilidad.';
    return 'Panel contextual segun el acceso actual.';
  });

  statusTitle = computed(() => {
    if (this.isSuperAdmin()) return 'Red operacional lista';
    if (this.isOwner()) return 'Taller sincronizado';
    if (this.isBranchAdmin()) return 'Sucursal en seguimiento';
    if (this.isTechnician()) return 'Jornada preparada';
    if (this.isClient()) return 'Asistencia disponible';
    return 'Operacion estable';
  });

  statusSummary = computed(() => {
    if (this.isSuperAdmin()) return 'Monitoreo global y trazabilidad centralizados.';
    if (this.isOwner()) return 'Listo para coordinar citas, equipo y solicitudes.';
    if (this.isBranchAdmin()) return 'Vista enfocada en la operacion local y su carga activa.';
    if (this.isTechnician()) return 'Prioriza tus asignaciones y tiempos de llegada.';
    if (this.isClient()) return 'Consulta el avance del servicio desde una vista simplificada.';
    return 'Vista general lista para seguimiento.';
  });

  title = computed(() =>
    this.isSuperAdmin()
      ? 'Centro de control AutoAssist AI'
      : this.isOwner()
        ? 'Direccion operativa del taller'
        : this.isBranchAdmin()
          ? 'Control operativo de la sucursal'
          : this.isTechnician()
            ? 'Panel de ejecucion tecnica'
            : this.isClient()
              ? 'Seguimiento de asistencia'
              : 'Panel operativo del taller'
  );

  subtitle = computed(() =>
    this.isSuperAdmin()
      ? 'Supervisa la red completa, el aislamiento multi-tenant y la operacion en tiempo real.'
      : this.isOwner()
        ? 'Administra incidentes, sucursales, cotizaciones y desempeno del equipo desde una sola vista.'
        : this.isBranchAdmin()
          ? 'Monitorea la demanda diaria, el calendario y la atencion activa de tu sucursal.'
          : this.isTechnician()
            ? 'Consulta el estado operativo, los servicios activos y la actividad reciente del dia.'
            : this.isClient()
              ? 'Revisa el estado del servicio y los movimientos mas recientes asociados a tu asistencia.'
              : 'Monitorea incidentes, equipo tecnico y desempeno diario desde una sola vista.'
  );

  incidentsQuery = injectQuery(() => ({
    queryKey: ['home-recent-incidents', this.userRole()],
    queryFn: () => {
      if (this.isSuperAdmin()) {
        return lastValueFrom(this.emergenciesService.getAllIncidents());
      }

      return lastValueFrom(this.workshopsService.getAssignments());
    },
    refetchInterval: 30000,
  }));

  recentIncidents = computed(() => (this.incidentsQuery.data() || []).slice(0, 5));

  highlights = computed(() => this.isSuperAdmin()
    ? [
        'Visibilidad global de talleres, tenants y emergencias activas.',
        'Seguimiento unificado de auditoria, incidentes y finanzas.',
        'Acceso directo a operaciones criticas sin salir del dashboard.',
      ]
    : this.isOwner()
      ? [
        'Control del flujo operativo del taller y sus sucursales.',
        'Seguimiento rapido de tecnicos, solicitudes y cotizaciones.',
        'Vista priorizada para responder antes en campo.',
      ]
      : this.isBranchAdmin()
        ? [
          'Visibilidad local del calendario, incidentes y demanda del dia.',
          'Mejor control de carga por sucursal y tiempos de respuesta.',
          'Acceso directo a acciones clave sin perder contexto.',
        ]
        : this.isTechnician()
          ? [
            'Lectura rapida de servicios activos y estados recientes.',
            'Menos ruido visual para enfocarte en lo urgente.',
            'Vista clara para trabajar desde movil o campo.',
          ]
          : this.isClient()
            ? [
              'Seguimiento simple del avance del servicio solicitado.',
              'Informacion priorizada para entender el estado actual.',
              'Experiencia clara para consulta rapida desde cualquier pantalla.',
            ]
            : [
              'Control del flujo operativo del taller y sus sucursales.',
              'Seguimiento rapido de tecnicos, solicitudes y cotizaciones.',
              'Vista priorizada para responder antes en campo.',
            ]
  );

  kpis = computed<HomeKpi[]>(() => {
    const data = this.incidentsQuery.data() || [];
    const active = data.filter(i => ['EN_CAMINO', 'EN_PROGRESO', 'EN_ATENCION', 'FINALIZADO'].includes(i.estado_incidente ?? '')).length;
    const completed = data.filter(i => i.estado_incidente === 'COMPLETADO').length;

    return [
      {
        label: this.isSuperAdmin() ? 'Emergencias globales' : 'Mis emergencias',
        value: data.length.toString(),
        icon: Siren,
        detail: 'Total registradas en el sistema',
        trend: 0,
      },
      {
        label: this.isSuperAdmin() ? 'Atencion activa' : 'En progreso',
        value: active.toString(),
        icon: Activity,
        detail: 'Servicios actualmente en campo',
        trend: active > 0 ? 5 : 0,
      },
      {
        label: 'Servicios finalizados',
        value: completed.toString(),
        icon: BadgeCheck,
        detail: 'Historico resuelto con exito',
        trend: 10,
      },
    ];
  });

  quickActions = computed<HomeQuickAction[]>(() => {
    if (this.isSuperAdmin()) {
      return [
        {
          key: 'monitor',
          label: 'Monitor en tiempo real',
          icon: Radar,
          description: 'Ver emergencias activas en el mapa.',
          route: '/emergencies/active',
        },
        {
          key: 'workshops',
          label: 'Gestionar talleres',
          icon: Building2,
          description: 'Administrar talleres afiliados a la plataforma.',
          route: '/monitoring/workshops',
        },
        {
          key: 'history',
          label: 'Historial global',
          icon: BookOpen,
          description: 'Auditoria completa de todos los servicios.',
          route: '/monitoring/history',
        },
        {
          key: 'finance',
          label: 'Consolidado financiero',
          icon: Wallet,
          description: 'Ver comisiones y liquidaciones del periodo.',
          route: '/finance/dashboard',
        },
      ];
    }

    if (this.isBranchAdmin()) {
      return [
        {
          key: 'calendar',
          label: 'Agenda de sucursal',
          icon: BookOpen,
          description: 'Revisar citas, reprogramaciones y carga diaria.',
          route: '/workshops/calendar',
        },
        {
          key: 'assignments',
          label: 'Solicitudes activas',
          icon: ClipboardList,
          description: 'Supervisar incidentes y asignaciones vigentes.',
          route: '/workshops/assignments',
        },
        {
          key: 'transfers',
          label: 'Traslados',
          icon: Truck,
          description: 'Gestionar fletes y traslados preventivos.',
          route: '/transfers',
        },
        {
          key: 'monitor',
          label: 'Monitor local',
          icon: Radar,
          description: 'Ver emergencias y actividad reciente de la sucursal.',
          route: '/emergencies/active',
        },
      ];
    }

    return [
      {
        key: 'view-assignments',
        label: 'Ver solicitudes',
        icon: ClipboardList,
        description: 'Ir al tablero Kanban de incidentes.',
        route: '/workshops/assignments',
      },
      {
        key: 'transfers',
        label: 'Traslados',
        icon: Truck,
        description: 'Gestionar fletes y traslados preventivos.',
        route: '/transfers',
      },
      {
        key: 'quotations',
        label: 'Cotizaciones',
        icon: ReceiptText,
        description: 'Revisar solicitudes y respuestas del taller.',
        route: '/quotations',
      },
      {
        key: 'manage-team',
        label: 'Gestionar equipo',
        icon: Users,
        description: 'Administrar tecnicos y disponibilidad.',
        route: '/workshops/team',
      },
      {
        key: 'monitor',
        label: 'Monitor de incidentes',
        icon: Radar,
        description: 'Ver emergencias asignadas a tu taller.',
        route: '/emergencies/active',
      },
      {
        key: 'finance',
        label: 'Mis finanzas',
        icon: Wallet,
        description: 'Resumen financiero y comisiones.',
        route: '/finance/dashboard',
      },
    ];
  });

  onQuickActionSelected(action: HomeQuickAction): void {
    if (action.route) {
      void this.router.navigate([action.route]);
    }
  }
}
