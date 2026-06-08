/**
 * CU33: GestiÃ³n de tenants y aislamiento de informaciÃ³n.
 * Vista para SuperAdmin dentro de DashboardLayout.
 */

import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { injectMutation, injectQuery } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import {
  AlertTriangle,
  Building2,
  LucideAngularModule,
  Pencil,
  PlusCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  Users,
  Wrench,
  XCircle,
} from 'lucide-angular';

import { PageHeaderComponent, LoadingStateComponent, EmptyStateComponent } from '@shared/ui';
import { AuthStore } from '@features/identity/auth/state/auth.store';
import { GestionTenantsAislamientoService } from '../../services/gestion-tenants-aislamiento.service';
import { WorkshopsService } from '@features/workshops/data-access/workshops.service';
import {
  BitacoraTenant,
  IncidenteTenant,
  TenantIsolationVerificationResult,
  TenantMetricsResponse,
  TallerTenant,
  TallerTenantCreate,
  UsuarioTenant,
} from '../../admin.models';
import { SucursalResponse } from '@core/models/workshops.model';

interface TenantFormData extends TallerTenantCreate {
  latitud: number;
  longitud: number;
}

@Component({
  selector: 'app-tenant-isolation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatPaginatorModule,
    MatTabsModule,
    MatSnackBarModule,
    LucideAngularModule,
    PageHeaderComponent,
    LoadingStateComponent,
    EmptyStateComponent,
  ],
  template: `
    <div class="page-container">
      <app-page-header
        title="Tenants y aislamiento"
        subtitle="CU33 para SuperAdmin: talleres, usuarios, tÃ©cnicos, incidentes, mÃ©tricas y bitÃ¡cora por tenant."
        [icon]="buildingIcon"
      >
        <div actions class="header-actions">
          <button mat-stroked-button class="action-button" (click)="refreshAll()">
            <lucide-icon [img]="refreshIcon" [size]="16"></lucide-icon>
            Actualizar
          </button>
          <button mat-flat-button color="primary" class="action-button" (click)="runIsolationCheck()" [disabled]="verifyIsolationMutation.isPending()">
            <lucide-icon [img]="shieldIcon" [size]="16"></lucide-icon>
            {{ verifyIsolationMutation.isPending() ? 'Verificando...' : 'Verificar aislamiento' }}
          </button>
        </div>
      </app-page-header>

      @if (!isSuperAdmin()) {
        <mat-card class="access-denied-card">
          <lucide-icon [img]="alertIcon" [size]="44" class="access-denied-icon"></lucide-icon>
          <h2>Acceso restringido</h2>
          <p>Esta pantalla solo estÃ¡ disponible para SuperAdmin.</p>
          <p>Rol actual: <strong>{{ authUser()?.rol_nombre || 'No autenticado' }}</strong></p>
        </mat-card>
      } @else {
        <div class="layout">
          <section class="panel tenants-panel">
            <div class="panel-header">
              <div>
                <h3>Listado de talleres / tenants</h3>
                <p>Busca, filtra y selecciona un tenant para revisar su aislamiento.</p>
              </div>
              <button mat-flat-button color="primary" (click)="openCreateTenantForm()">
                <lucide-icon [img]="plusIcon" [size]="16"></lucide-icon>
                Nuevo taller
              </button>
            </div>

            <div class="filters">
              <mat-form-field appearance="outline" class="search-field">
                <mat-label>Buscar</mat-label>
                <input
                  matInput
                  [ngModel]="searchTerm()"
                  (ngModelChange)="onSearchChange($event)"
                  placeholder="Nombre, NIT, correo o telÃ©fono"
                />
                <lucide-icon matTextSuffix [img]="searchIcon" [size]="16"></lucide-icon>
              </mat-form-field>

              <mat-form-field appearance="outline" class="status-field">
                <mat-label>Estado</mat-label>
                <mat-select [ngModel]="statusFilter()" (ngModelChange)="onStatusFilterChange($event)">
                  <mat-option value="">Todos</mat-option>
                  <mat-option value="activo">Activos</mat-option>
                  <mat-option value="inactivo">Inactivos</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            @if (tenantsQuery.isLoading()) {
              <app-loading-state message="Cargando tenants..."></app-loading-state>
            } @else if (tenantsQuery.isError()) {
              <div class="error-box">No se pudo cargar el listado de talleres.</div>
            } @else if (filteredTenants().length === 0) {
              <app-empty-state
                [icon]="buildingIcon"
                title="Sin talleres"
                message="No hay talleres que coincidan con el filtro actual."
              ></app-empty-state>
            } @else {
              <div class="tenant-table-wrapper">
                <table mat-table [dataSource]="pagedTenants()" class="tenant-table">
                  <ng-container matColumnDef="nombre">
                    <th mat-header-cell *matHeaderCellDef>Taller</th>
                    <td mat-cell *matCellDef="let tenant">
                      <div class="tenant-name">{{ tenant.nombre }}</div>
                      <div class="tenant-subtitle">NIT: {{ tenant.nit }}</div>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="contacto">
                    <th mat-header-cell *matHeaderCellDef>Contacto</th>
                    <td mat-cell *matCellDef="let tenant">
                      <div class="tenant-contact-main">{{ tenant.email || 'Sin correo' }}</div>
                      <div class="tenant-subtitle">{{ tenant.telefono || 'Sin teléfono' }}</div>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="estado">
                    <th mat-header-cell *matHeaderCellDef>Estado</th>
                    <td mat-cell *matCellDef="let tenant">
                      <span class="status-pill" [class.active]="tenant.is_active">
                        {{ tenant.is_active ? 'Activo' : 'Inactivo' }}
                      </span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="acciones">
                    <th mat-header-cell *matHeaderCellDef>Acciones</th>
                    <td mat-cell *matCellDef="let tenant">
                      <div class="tenant-actions">
                        <button mat-button color="primary" (click)="selectTenant(tenant)">Ver</button>
                        <button mat-button (click)="openEditTenantForm(tenant)">Editar</button>
                      </div>
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="tenantColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: tenantColumns;" class="table-row"></tr>
                </table>
              </div>

              <mat-paginator
                [length]="filteredTenants().length"
                [pageSize]="pageSize()"
                [pageIndex]="pageIndex()"
                [pageSizeOptions]="[5, 10, 20]"
                (page)="onPageChange($event)"
              ></mat-paginator>
            }
          </section>

          <section class="panel detail-panel">
            @if (!selectedTenant()) {
              <app-empty-state
                [icon]="usersIcon"
                title="Selecciona un tenant"
                message="Elige un taller de la lista para ver sus usuarios, tÃ©cnicos, incidentes, mÃ©tricas y bitÃ¡cora."
              ></app-empty-state>
            } @else {
              <div class="detail-header">
                <div>
                  <h3>{{ selectedTenant()?.nombre }}</h3>
                  <p class="tenant-subtitle">NIT: {{ selectedTenant()?.nit }}</p>
                </div>

                <div class="detail-actions">
                  <button
                    mat-flat-button
                    [color]="selectedTenant()?.is_active ? 'warn' : 'accent'"
                    (click)="toggleTenantStatus()"
                    [disabled]="toggleStatusMutation.isPending()"
                  >
                    {{ selectedTenant()?.is_active ? 'Desactivar' : 'Activar' }}
                  </button>
                  <button mat-button (click)="openEditTenantForm(selectedTenant())">
                    <lucide-icon [img]="pencilIcon" [size]="16"></lucide-icon>
                    Editar
                  </button>
                </div>
              </div>

              <mat-card class="summary-card">
                <div class="summary-grid">
                  <div>
                    <span class="summary-label">Correo</span>
                    <span class="summary-value">{{ selectedTenant()?.email || 'No registrado' }}</span>
                  </div>
                  <div>
                    <span class="summary-label">TelÃ©fono</span>
                    <span class="summary-value">{{ selectedTenant()?.telefono || 'No registrado' }}</span>
                  </div>
                  <div>
                    <span class="summary-label">DirecciÃ³n</span>
                    <span class="summary-value">{{ selectedTenant()?.direccion || 'No registrada' }}</span>
                  </div>
                  <div>
                    <span class="summary-label">Coordenadas</span>
                    <span class="summary-value">{{ selectedTenant()?.latitud ?? 'N/D' }}, {{ selectedTenant()?.longitud ?? 'N/D' }}</span>
                  </div>
                </div>
              </mat-card>

              @if (verificationResult()) {
                <mat-card class="verification-card">
                  <div class="card-title">VerificaciÃ³n de aislamiento</div>
                  <pre>{{ verificationResult() | json }}</pre>
                </mat-card>
              }

              <mat-tab-group [selectedIndex]="selectedTabIndex()" (selectedIndexChange)="selectedTabIndex.set($event)">
                <mat-tab label="Usuarios">
                  <div class="tab-content">
                    <div class="tab-toolbar">
                      <h4>Usuarios asociados al tenant</h4>
                      <button mat-flat-button color="primary" (click)="openUserAssociationForm()">
                        <lucide-icon [img]="plusIcon" [size]="14"></lucide-icon>
                        Asociar usuario
                      </button>
                    </div>

                    @if (usersQuery.isLoading()) {
                      <app-loading-state message="Cargando usuarios..."></app-loading-state>
                    } @else if (usersQuery.isError()) {
                      <div class="error-box">No se pudieron cargar los usuarios asociados.</div>
                    } @else if ((usersQuery.data() ?? []).length === 0) {
                      <app-empty-state [icon]="usersIcon" title="Sin usuarios" message="Este taller aÃºn no tiene usuarios asociados."></app-empty-state>
                    } @else {
                      <table mat-table [dataSource]="usersQuery.data() ?? []" class="detail-table">
                        <ng-container matColumnDef="nombre">
                          <th mat-header-cell *matHeaderCellDef>Nombre</th>
                          <td mat-cell *matCellDef="let user">{{ user.nombre }}</td>
                        </ng-container>

                        <ng-container matColumnDef="correo">
                          <th mat-header-cell *matHeaderCellDef>Correo</th>
                          <td mat-cell *matCellDef="let user">{{ user.correo }}</td>
                        </ng-container>

                        <ng-container matColumnDef="rol">
                          <th mat-header-cell *matHeaderCellDef>Rol</th>
                          <td mat-cell *matCellDef="let user">{{ user.rol_nombre }}</td>
                        </ng-container>

                        <ng-container matColumnDef="estado">
                          <th mat-header-cell *matHeaderCellDef>Estado</th>
                          <td mat-cell *matCellDef="let user">
                            <span class="status-pill" [class.active]="user.estado">{{ user.estado ? 'Activo' : 'Inactivo' }}</span>
                          </td>
                        </ng-container>

                        <tr mat-header-row *matHeaderRowDef="userColumns"></tr>
                        <tr mat-row *matRowDef="let row; columns: userColumns;"></tr>
                      </table>
                    }
                  </div>
                </mat-tab>

                <mat-tab label="Sucursales">
                  <div class="tab-content">
                    <div class="tab-toolbar">
                      <h4>Sucursales asociadas al taller</h4>
                      <button mat-stroked-button color="primary" (click)="openBranchManager()">
                        <lucide-icon [img]="buildingIcon" [size]="14"></lucide-icon>
                        Ir a gestión
                      </button>
                    </div>

                    @if (branchesQuery.isLoading()) {
                      <app-loading-state message="Cargando sucursales..."></app-loading-state>
                    } @else if (branchesQuery.isError()) {
                      <div class="error-box">No se pudieron cargar las sucursales asociadas.</div>
                    } @else if ((branchesQuery.data() ?? []).length === 0) {
                      <app-empty-state
                        [icon]="buildingIcon"
                        title="Sin sucursales"
                        message="Este taller aún no tiene sucursales registradas."
                      ></app-empty-state>
                    } @else {
                      <table mat-table [dataSource]="branchesQuery.data() ?? []" class="detail-table">
                        <ng-container matColumnDef="nombre">
                          <th mat-header-cell *matHeaderCellDef>Nombre</th>
                          <td mat-cell *matCellDef="let branch">
                            <div class="tenant-name">{{ branch.nombre }}</div>
                            <div class="tenant-subtitle">ID: {{ branch.id_sucursal }}</div>
                          </td>
                        </ng-container>

                        <ng-container matColumnDef="contacto">
                          <th mat-header-cell *matHeaderCellDef>Contacto</th>
                          <td mat-cell *matCellDef="let branch">
                            <div>{{ branch.telefono || 'Sin teléfono' }}</div>
                            <div class="tenant-subtitle">{{ branch.email || 'Sin correo' }}</div>
                          </td>
                        </ng-container>

                        <ng-container matColumnDef="direccion">
                          <th mat-header-cell *matHeaderCellDef>Dirección</th>
                          <td mat-cell *matCellDef="let branch">{{ branch.direccion || 'Sin dirección' }}</td>
                        </ng-container>

                        <ng-container matColumnDef="estado">
                          <th mat-header-cell *matHeaderCellDef>Estado</th>
                          <td mat-cell *matCellDef="let branch">
                            <span class="status-pill" [class.active]="branch.estado">
                              {{ branch.estado ? 'Activo' : 'Inactivo' }}
                            </span>
                          </td>
                        </ng-container>

                        <ng-container matColumnDef="creacion">
                          <th mat-header-cell *matHeaderCellDef>Creación</th>
                          <td mat-cell *matCellDef="let branch">{{ branch.fecha_creacion || 'N/D' }}</td>
                        </ng-container>

                        <ng-container matColumnDef="acciones">
                          <th mat-header-cell *matHeaderCellDef>Acciones</th>
                          <td mat-cell *matCellDef="let branch">
                            <button mat-button color="primary" (click)="openBranchManager(branch)">Ver</button>
                            <button mat-button (click)="openBranchManager(branch)">Editar</button>
                          </td>
                        </ng-container>

                        <tr mat-header-row *matHeaderRowDef="branchColumns"></tr>
                        <tr mat-row *matRowDef="let row; columns: branchColumns;"></tr>
                      </table>
                    }
                  </div>
                </mat-tab>

                <mat-tab label="Técnicos">
                  <div class="tab-content">
                    <div class="tab-toolbar">
                      <h4>TÃ©cnicos asociados al tenant</h4>
                      <button mat-flat-button color="primary" (click)="openTechnicianAssociationForm()">
                        <lucide-icon [img]="plusIcon" [size]="14"></lucide-icon>
                        Asociar tÃ©cnico
                      </button>
                    </div>

                    @if (techniciansQuery.isLoading()) {
                      <app-loading-state message="Cargando tÃ©cnicos..."></app-loading-state>
                    } @else if (techniciansQuery.isError()) {
                      <div class="error-box">No se pudieron cargar los tÃ©cnicos asociados.</div>
                    } @else if ((techniciansQuery.data() ?? []).length === 0) {
                      <app-empty-state [icon]="wrenchIcon" title="Sin tÃ©cnicos" message="Este taller aÃºn no tiene tÃ©cnicos asociados."></app-empty-state>
                    } @else {
                      <table mat-table [dataSource]="techniciansQuery.data() ?? []" class="detail-table">
                        <ng-container matColumnDef="nombre">
                          <th mat-header-cell *matHeaderCellDef>Nombre</th>
                          <td mat-cell *matCellDef="let tech">{{ tech.nombre }}</td>
                        </ng-container>

                        <ng-container matColumnDef="correo">
                          <th mat-header-cell *matHeaderCellDef>Correo</th>
                          <td mat-cell *matCellDef="let tech">{{ tech.correo }}</td>
                        </ng-container>

                        <ng-container matColumnDef="telefono">
                          <th mat-header-cell *matHeaderCellDef>TelÃ©fono</th>
                          <td mat-cell *matCellDef="let tech">{{ tech.telefono || 'No registrado' }}</td>
                        </ng-container>

                        <ng-container matColumnDef="estado">
                          <th mat-header-cell *matHeaderCellDef>Estado</th>
                          <td mat-cell *matCellDef="let tech">
                            <span class="status-pill" [class.active]="tech.estado">{{ tech.estado ? 'Activo' : 'Inactivo' }}</span>
                          </td>
                        </ng-container>

                        <tr mat-header-row *matHeaderRowDef="technicianColumns"></tr>
                        <tr mat-row *matRowDef="let row; columns: technicianColumns;"></tr>
                      </table>
                    }
                  </div>
                </mat-tab>

                <mat-tab label="Incidentes">
                  <div class="tab-content">
                    <div class="tab-toolbar">
                      <h4>Últimos incidentes recientes</h4>
                    </div>

                    @if (incidentsQuery.isLoading()) {
                      <app-loading-state message="Cargando incidentes..."></app-loading-state>
                    } @else if (incidentsQuery.isError()) {
                      <div class="error-box">No se pudieron cargar los incidentes del tenant.</div>
                    } @else if (recentIncidents().length === 0) {
                      <app-empty-state title="Sin incidentes" message="Este taller aún no tiene incidentes registrados."></app-empty-state>
                    } @else {
                      <table mat-table [dataSource]="recentIncidents()" class="detail-table">
                        <ng-container matColumnDef="fecha_reporte">
                          <th mat-header-cell *matHeaderCellDef>Fecha reporte</th>
                          <td mat-cell *matCellDef="let incident">{{ incident.fecha_reporte || 'N/D' }}</td>
                        </ng-container>

                        <ng-container matColumnDef="cliente">
                          <th mat-header-cell *matHeaderCellDef>Cliente</th>
                          <td mat-cell *matCellDef="let incident">
                            <div class="tenant-name">{{ incident.client_name || 'Sin nombre' }}</div>
                            <div class="tenant-subtitle">{{ incident.client_phone || incident.telefono || 'Sin teléfono' }}</div>
                          </td>
                        </ng-container>

                        <ng-container matColumnDef="vehiculo">
                          <th mat-header-cell *matHeaderCellDef>Vehículo / Matrícula</th>
                          <td mat-cell *matCellDef="let incident">
                            <div class="tenant-name">{{ getVehicleLabel(incident) }}</div>
                            <div class="tenant-subtitle">{{ incident.vehicle_plate || 'Sin matrícula' }}</div>
                          </td>
                        </ng-container>

                        <ng-container matColumnDef="tecnico">
                          <th mat-header-cell *matHeaderCellDef>Técnico</th>
                          <td mat-cell *matCellDef="let incident">{{ incident.technician_name || 'Sin técnico' }}</td>
                        </ng-container>

                        <ng-container matColumnDef="prioridad">
                          <th mat-header-cell *matHeaderCellDef>Prioridad</th>
                          <td mat-cell *matCellDef="let incident">{{ incident.prioridad_incidente || 'N/D' }}</td>
                        </ng-container>

                        <ng-container matColumnDef="estado">
                          <th mat-header-cell *matHeaderCellDef>Estado</th>
                          <td mat-cell *matCellDef="let incident">
                            <span class="status-pill" [class.active]="isIncidentClosed(incident.estado_incidente)">
                              {{ incident.estado_incidente }}
                            </span>
                          </td>
                        </ng-container>

                        <ng-container matColumnDef="sucursal">
                          <th mat-header-cell *matHeaderCellDef>Sucursal</th>
                          <td mat-cell *matCellDef="let incident">{{ incident.branch_name || incident.id_sucursal || 'Sin sucursal' }}</td>
                        </ng-container>

                        <ng-container matColumnDef="acciones">
                          <th mat-header-cell *matHeaderCellDef>Acción</th>
                          <td mat-cell *matCellDef="let incident">
                            <button mat-button color="primary" (click)="openIncidentDetail(incident.id_incidente)">Ver detalle</button>
                          </td>
                        </ng-container>

                        <tr mat-header-row *matHeaderRowDef="incidentColumns"></tr>
                        <tr mat-row *matRowDef="let row; columns: incidentColumns;"></tr>
                      </table>
                    }
                  </div>
                </mat-tab>

                <mat-tab label="MÃ©tricas">
                  <div class="tab-content">
                    <h4>MÃ©tricas bÃ¡sicas del tenant</h4>

                    @if (metricsQuery.isLoading()) {
                      <app-loading-state message="Cargando mÃ©tricas..."></app-loading-state>
                    } @else if (metricsQuery.isError()) {
                      <div class="error-box">No se pudieron cargar las mÃ©tricas del tenant.</div>
                    } @else {
                      <div class="metrics-grid">
                        <mat-card class="metric-card">
                          <span class="metric-label">Total incidentes</span>
                          <span class="metric-value">{{ tenantMetrics().total_incidentes }}</span>
                        </mat-card>
                        <mat-card class="metric-card">
                          <span class="metric-label">Incidentes abiertos</span>
                          <span class="metric-value">{{ tenantMetrics().incidentes_abiertos }}</span>
                        </mat-card>
                        <mat-card class="metric-card">
                          <span class="metric-label">Total tÃ©cnicos</span>
                          <span class="metric-value">{{ tenantMetrics().total_tecnicos }}</span>
                        </mat-card>
                        <mat-card class="metric-card">
                          <span class="metric-label">Sucursales activas</span>
                          <span class="metric-value">{{ tenantMetrics().sucursales_activas }}</span>
                        </mat-card>
                      </div>
                    }
                  </div>
                </mat-tab>

                <mat-tab label="BitÃ¡cora">
                  <div class="tab-content">
                    <h4>BitÃ¡cora filtrada por tenant</h4>

                    @if (bitacoraQuery.isLoading()) {
                      <app-loading-state message="Cargando bitÃ¡cora..."></app-loading-state>
                    } @else if (bitacoraQuery.isError()) {
                      <div class="error-box">No se pudo cargar la bitÃ¡cora del tenant.</div>
                    } @else if ((bitacoraQuery.data() ?? []).length === 0) {
                      <app-empty-state title="Sin registros" message="No hay movimientos registrados para este taller."></app-empty-state>
                    } @else {
                      <table mat-table [dataSource]="bitacoraQuery.data() ?? []" class="detail-table">
                        <ng-container matColumnDef="fecha_hora">
                          <th mat-header-cell *matHeaderCellDef>Fecha</th>
                          <td mat-cell *matCellDef="let log">{{ log.fecha_hora }}</td>
                        </ng-container>

                        <ng-container matColumnDef="accion">
                          <th mat-header-cell *matHeaderCellDef>AcciÃ³n</th>
                          <td mat-cell *matCellDef="let log">{{ log.accion }}</td>
                        </ng-container>

                        <ng-container matColumnDef="nombre_usuario">
                          <th mat-header-cell *matHeaderCellDef>Actor</th>
                          <td mat-cell *matCellDef="let log">{{ log.rol_usuario || log.id_usuario_actor }}</td>
                        </ng-container>

                        <ng-container matColumnDef="descripcion">
                          <th mat-header-cell *matHeaderCellDef>Detalle</th>
                          <td mat-cell *matCellDef="let log">{{ log.descripcion || 'Sin detalle' }}</td>
                        </ng-container>

                        <tr mat-header-row *matHeaderRowDef="bitacoraColumns"></tr>
                        <tr mat-row *matRowDef="let row; columns: bitacoraColumns;"></tr>
                      </table>
                    }
                  </div>
                </mat-tab>
              </mat-tab-group>
            }
          </section>
        </div>
      }
    </div>

    @if (showTenantForm()) {
      <div class="overlay" (click)="closeTenantForm()">
        <mat-card class="dialog" (click)="$event.stopPropagation()">
          <div class="dialog-header">
            <h3>{{ tenantFormMode() === 'edit' ? 'Editar taller' : 'Nuevo taller' }}</h3>
            <button mat-icon-button (click)="closeTenantForm()">
              <lucide-icon [img]="closeIcon" [size]="20"></lucide-icon>
            </button>
          </div>

          <div class="dialog-body">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Nombre *</mat-label>
              <input matInput [(ngModel)]="tenantFormData.nombre" />
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>NIT *</mat-label>
              <input matInput [(ngModel)]="tenantFormData.nit" />
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Correo</mat-label>
              <input matInput type="email" [(ngModel)]="tenantFormData.email" />
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>TelÃ©fono</mat-label>
              <input matInput [(ngModel)]="tenantFormData.telefono" />
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>DirecciÃ³n</mat-label>
              <input matInput [(ngModel)]="tenantFormData.direccion" />
            </mat-form-field>

            <div class="two-columns">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Latitud</mat-label>
                <input matInput type="number" [(ngModel)]="tenantFormData.latitud" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Longitud</mat-label>
                <input matInput type="number" [(ngModel)]="tenantFormData.longitud" />
              </mat-form-field>
            </div>
          </div>

          <div class="dialog-actions">
            <button mat-flat-button color="primary" (click)="saveTenant()" [disabled]="tenantSaveMutation.isPending()">
              {{ tenantSaveMutation.isPending() ? 'Guardando...' : (tenantFormMode() === 'edit' ? 'Actualizar taller' : 'Crear taller') }}
            </button>
            <button mat-button (click)="closeTenantForm()">Cancelar</button>
          </div>
        </mat-card>
      </div>
    }

    @if (showUserAssociationForm()) {
      <div class="overlay" (click)="closeUserAssociationForm()">
        <mat-card class="dialog" (click)="$event.stopPropagation()">
          <div class="dialog-header">
            <h3>Asociar usuario existente</h3>
            <button mat-icon-button (click)="closeUserAssociationForm()">
              <lucide-icon [img]="closeIcon" [size]="20"></lucide-icon>
            </button>
          </div>

          <div class="dialog-body">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>ID de usuario *</mat-label>
              <input matInput [(ngModel)]="userAssociationData.id_usuario" />
            </mat-form-field>
            <p class="helper-text">Este flujo asocia un usuario ya existente al tenant seleccionado.</p>
          </div>

          <div class="dialog-actions">
            <button mat-flat-button color="primary" (click)="associateUser()" [disabled]="associateUserMutation.isPending()">
              {{ associateUserMutation.isPending() ? 'Asociando...' : 'Asociar usuario' }}
            </button>
            <button mat-button (click)="closeUserAssociationForm()">Cancelar</button>
          </div>
        </mat-card>
      </div>
    }

    @if (showTechnicianAssociationForm()) {
      <div class="overlay" (click)="closeTechnicianAssociationForm()">
        <mat-card class="dialog" (click)="$event.stopPropagation()">
          <div class="dialog-header">
            <h3>Asociar tÃ©cnico existente</h3>
            <button mat-icon-button (click)="closeTechnicianAssociationForm()">
              <lucide-icon [img]="closeIcon" [size]="20"></lucide-icon>
            </button>
          </div>

          <div class="dialog-body">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>ID de tÃ©cnico *</mat-label>
              <input matInput [(ngModel)]="technicianAssociationData.id_tecnico" />
            </mat-form-field>
            <p class="helper-text">Este flujo asocia un tÃ©cnico ya existente al tenant seleccionado.</p>
          </div>

          <div class="dialog-actions">
            <button mat-flat-button color="primary" (click)="associateTechnician()" [disabled]="associateTechnicianMutation.isPending()">
              {{ associateTechnicianMutation.isPending() ? 'Asociando...' : 'Asociar tÃ©cnico' }}
            </button>
            <button mat-button (click)="closeTechnicianAssociationForm()">Cancelar</button>
          </div>
        </mat-card>
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
    }

    .page-container {
      padding: 1.5rem;
      max-width: 1600px;
      margin: 0 auto;
    }

    .header-actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .action-button {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    .access-denied-card {
      margin-top: 1.5rem;
      padding: 2rem;
      text-align: center;
      display: grid;
      gap: 0.75rem;
      justify-items: center;
    }

    .access-denied-icon {
      color: #f97316;
    }

    .layout {
      display: grid;
      grid-template-columns: minmax(380px, 440px) minmax(0, 1fr);
      gap: 1.25rem;
      margin-top: 1.5rem;
    }

    .panel {
      background: rgba(10, 15, 25, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 18px;
      padding: 1.25rem;
      min-width: 0;
      overflow: hidden;
    }

    .panel-header,
    .detail-header,
    .tab-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }

    .panel-header h3,
    .detail-header h3,
    .tab-toolbar h4 {
      margin: 0;
    }

    .panel-header p,
    .tenant-subtitle {
      margin: 0.25rem 0 0;
      color: var(--sm-color-text-muted);
    }

    .filters {
      display: grid;
      grid-template-columns: 1fr 160px;
      gap: 0.85rem;
      margin: 1rem 0 1.25rem;
    }

    .search-field,
    .status-field {
      width: 100%;
    }

    .tenant-table,
    .detail-table {
      width: 100%;
    }

    .tenant-table-wrapper {
      width: 100%;
      max-width: 100%;
      overflow-x: auto;
      overflow-y: hidden;
    }

    .tenant-table {
      width: 100%;
      min-width: 560px;
      table-layout: fixed;
    }

    .tenant-table th,
    .tenant-table td {
      overflow: hidden;
      text-overflow: ellipsis;
      vertical-align: middle;
    }

    .tenant-table .mat-column-nombre {
      width: 30%;
    }

    .tenant-table .mat-column-contacto {
      width: 34%;
    }

    .tenant-table .mat-column-estado {
      width: 18%;
    }

    .tenant-table .mat-column-acciones {
      width: 18%;
      text-align: right;
    }

    .tenant-table th,
    .detail-table th {
      color: var(--sm-color-text-muted);
      text-transform: uppercase;
      font-size: 0.72rem;
      letter-spacing: 0.04em;
    }

    .tenant-table td,
    .detail-table td {
      padding-top: 0.9rem;
      padding-bottom: 0.9rem;
    }

    .tenant-name {
      font-weight: 600;
    }

    .tenant-name,
    .tenant-contact-main,
    .tenant-subtitle {
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .tenant-name,
    .tenant-contact-main {
      white-space: nowrap;
    }

    .tenant-subtitle {
      font-size: 0.8rem;
      word-break: break-word;
    }

    .tenant-actions {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.25rem;
    }

    .tenant-actions button {
      min-width: auto;
      padding: 0 0.35rem;
      line-height: 28px;
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.35rem 0.75rem;
      border-radius: 999px;
      font-size: 0.75rem;
      background: rgba(255, 255, 255, 0.08);
      color: var(--sm-color-text-soft);
    }

    .status-pill.active {
      background: rgba(34, 197, 94, 0.18);
      color: #86efac;
    }

    .summary-card,
    .verification-card {
      margin-top: 1rem;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1rem;
    }

    .summary-label,
    .metric-label {
      display: block;
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--sm-color-text-muted);
      margin-bottom: 0.25rem;
    }

    .summary-value,
    .metric-value {
      font-weight: 600;
    }

    .tab-content {
      padding-top: 1rem;
    }

    .detail-panel mat-tab-group {
      margin-top: 0.75rem;
    }

    .detail-panel .detail-table {
      margin-top: 0.5rem;
    }

    .tab-toolbar {
      margin-bottom: 1rem;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.85rem;
      margin-top: 1rem;
    }

    .metric-card {
      padding: 1rem;
      text-align: center;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
    }

    .error-box {
      padding: 1rem;
      border-radius: 12px;
      background: rgba(239, 68, 68, 0.12);
      color: #fecaca;
    }

    .overlay {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      background: rgba(0, 0, 0, 0.55);
      z-index: 1000;
    }

    .dialog {
      width: min(640px, 100%);
      max-height: 90vh;
      overflow: auto;
      background: var(--sm-color-gunmetal-850);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .dialog-header,
    .dialog-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 1.25rem;
    }

    .dialog-header {
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .dialog-body {
      padding: 1.25rem;
    }

    .dialog-actions {
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }

    .full-width {
      width: 100%;
      margin-bottom: 0.85rem;
    }

    .two-columns {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.85rem;
    }

    .helper-text {
      margin: 0;
      color: var(--sm-color-text-muted);
      font-size: 0.9rem;
    }

    pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      color: var(--sm-color-text-main);
    }

    @media (max-width: 1200px) {
      .layout,
      .metrics-grid {
        grid-template-columns: 1fr;
      }

      .filters,
      .summary-grid,
      .two-columns {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class TenantIsolationPage {
  private readonly authStore = inject(AuthStore);
  private readonly adminService = inject(GestionTenantsAislamientoService);
  private readonly workshopsService = inject(WorkshopsService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly buildingIcon = Building2;
  readonly usersIcon = Users;
  readonly wrenchIcon = Wrench;
  readonly shieldIcon = ShieldAlert;
  readonly searchIcon = Search;
  readonly refreshIcon = RefreshCw;
  readonly plusIcon = PlusCircle;
  readonly pencilIcon = Pencil;
  readonly alertIcon = AlertTriangle;
  readonly closeIcon = XCircle;

  readonly authUser = computed(() => this.authStore.user());
  readonly isSuperAdmin = computed(() => {
    const role = this.authUser()?.rol_nombre?.toLowerCase().trim();
    return role === 'superadmin' || role === 'admin_sistema' || role === 'root';
  });

  readonly selectedTenant = signal<TallerTenant | null>(null);
  readonly selectedTabIndex = signal(0);
  readonly showTenantForm = signal(false);
  readonly tenantFormMode = signal<'create' | 'edit'>('create');
  readonly showUserAssociationForm = signal(false);
  readonly showTechnicianAssociationForm = signal(false);
  readonly searchTerm = signal('');
  readonly statusFilter = signal('');
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly verificationResult = signal<TenantIsolationVerificationResult | null>(null);

  tenantFormData: TenantFormData = this.createEmptyTenantForm();
  userAssociationData = { id_usuario: '' };
  technicianAssociationData = { id_tecnico: '' };

  readonly tenantColumns = ['nombre', 'contacto', 'estado', 'acciones'];
  readonly userColumns = ['nombre', 'correo', 'rol', 'estado'];
  readonly branchColumns = ['nombre', 'contacto', 'direccion', 'estado', 'creacion', 'acciones'];
  readonly technicianColumns = ['nombre', 'correo', 'telefono', 'estado'];
  readonly incidentColumns = ['fecha_reporte', 'cliente', 'vehiculo', 'tecnico', 'prioridad', 'estado', 'sucursal', 'acciones'];
  readonly bitacoraColumns = ['fecha_hora', 'accion', 'nombre_usuario', 'descripcion'];

  readonly tenantsQuery = injectQuery(() => ({
    queryKey: ['admin', 'tenants'],
    queryFn: () => lastValueFrom(this.adminService.getTenants()),
  }));

  readonly usersQuery = injectQuery(() => {
    const idTaller = this.selectedTenant()?.id_taller;
    return {
      queryKey: ['admin', 'tenant-users', idTaller],
      enabled: computed(() => !!this.selectedTenant()?.id_taller),
      queryFn: () => idTaller ? lastValueFrom(this.adminService.getTenantUsers(idTaller)) : Promise.resolve([] as UsuarioTenant[]),
    };
  });

  readonly branchesQuery = injectQuery(() => {
    const idTaller = this.selectedTenant()?.id_taller;
    return {
      queryKey: ['admin', 'tenant-branches', idTaller],
      enabled: computed(() => !!this.selectedTenant()?.id_taller),
      queryFn: () => idTaller
        ? lastValueFrom(this.workshopsService.getBranchesByWorkshop(idTaller))
        : Promise.resolve([] as SucursalResponse[]),
    };
  });

  readonly techniciansQuery = injectQuery(() => {
    const idTaller = this.selectedTenant()?.id_taller;
    return {
      queryKey: ['admin', 'tenant-technicians', idTaller],
      enabled: computed(() => !!this.selectedTenant()?.id_taller),
      queryFn: () => idTaller ? lastValueFrom(this.adminService.getTenantTechnicians(idTaller)) : Promise.resolve([] as UsuarioTenant[]),
    };
  });

  readonly incidentsQuery = injectQuery(() => {
    const idTaller = this.selectedTenant()?.id_taller;
    return {
      queryKey: ['admin', 'tenant-incidents', idTaller],
      enabled: computed(() => !!this.selectedTenant()?.id_taller),
      queryFn: () => idTaller ? lastValueFrom(this.adminService.getTenantIncidents(idTaller)) : Promise.resolve([] as IncidenteTenant[]),
    };
  });

  readonly metricsQuery = injectQuery(() => {
    const idTaller = this.selectedTenant()?.id_taller;
    return {
      queryKey: ['admin', 'tenant-metrics', idTaller],
      enabled: computed(() => !!this.selectedTenant()?.id_taller),
      queryFn: () => idTaller
        ? lastValueFrom(this.adminService.getTenantMetrics(idTaller))
        : Promise.resolve(this.emptyMetrics()),
    };
  });

  readonly bitacoraQuery = injectQuery(() => {
    const idTaller = this.selectedTenant()?.id_taller;
    return {
      queryKey: ['admin', 'tenant-bitacora', idTaller],
      enabled: computed(() => !!this.selectedTenant()?.id_taller),
      queryFn: () => idTaller ? lastValueFrom(this.adminService.getTenantBitacora(idTaller)) : Promise.resolve([] as BitacoraTenant[]),
    };
  });

  readonly tenantSaveMutation = injectMutation(() => ({
    mutationFn: (payload: { idTaller?: string; data: TallerTenantCreate }) =>
      payload.idTaller
        ? lastValueFrom(this.adminService.updateTenant(payload.idTaller, payload.data))
        : lastValueFrom(this.adminService.createTenant(payload.data)),
    onSuccess: (tenant) => {
      this.snackBar.open(
        this.tenantFormMode() === 'edit' ? 'Taller actualizado.' : 'Taller creado.',
        'Cerrar',
        { duration: 3000 }
      );
      this.closeTenantForm();
      this.tenantsQuery.refetch();
      this.selectTenant(tenant);
    },
    onError: () => {
      this.snackBar.open('No se pudo guardar el taller.', 'Cerrar', { duration: 4000 });
    },
  }));

  readonly toggleStatusMutation = injectMutation(() => ({
    mutationFn: (payload: { idTaller: string; activo: boolean }) =>
      lastValueFrom(this.adminService.updateTenantStatus(payload.idTaller, payload.activo)),
    onSuccess: (tenant) => {
      this.selectedTenant.set(tenant);
      this.tenantsQuery.refetch();
      this.refreshDetailQueries();
      this.snackBar.open('Estado del taller actualizado.', 'Cerrar', { duration: 3000 });
    },
    onError: () => {
      this.snackBar.open('No se pudo cambiar el estado del taller.', 'Cerrar', { duration: 4000 });
    },
  }));

  readonly associateUserMutation = injectMutation(() => ({
    mutationFn: (payload: { idTaller: string; idUsuario: string }) =>
      lastValueFrom(this.adminService.associateUser(payload.idTaller, payload.idUsuario)),
    onSuccess: () => {
      this.snackBar.open('Usuario asociado al taller.', 'Cerrar', { duration: 3000 });
      this.closeUserAssociationForm();
      this.usersQuery.refetch();
      this.bitacoraQuery.refetch();
    },
    onError: () => {
      this.snackBar.open('No se pudo asociar el usuario.', 'Cerrar', { duration: 4000 });
    },
  }));

  readonly associateTechnicianMutation = injectMutation(() => ({
    mutationFn: (payload: { idTaller: string; idTecnico: string }) =>
      lastValueFrom(this.adminService.associateTechnician(payload.idTaller, payload.idTecnico)),
    onSuccess: () => {
      this.snackBar.open('TÃ©cnico asociado al taller.', 'Cerrar', { duration: 3000 });
      this.closeTechnicianAssociationForm();
      this.techniciansQuery.refetch();
      this.bitacoraQuery.refetch();
    },
    onError: () => {
      this.snackBar.open('No se pudo asociar el tÃ©cnico.', 'Cerrar', { duration: 4000 });
    },
  }));

  readonly verifyIsolationMutation = injectMutation(() => ({
    mutationFn: () => lastValueFrom(this.adminService.verifyIsolation()),
    onSuccess: (result) => {
      this.verificationResult.set(result);
      this.snackBar.open('VerificaciÃ³n de aislamiento completada.', 'Cerrar', { duration: 3000 });
    },
    onError: () => {
      this.snackBar.open('No se pudo verificar el aislamiento.', 'Cerrar', { duration: 4000 });
    },
  }));

  readonly filteredTenants = computed(() => {
    const tenants = this.tenantsQuery.data() ?? [];
    const search = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();

    return tenants.filter((tenant) => {
      const matchesSearch =
        !search ||
        tenant.nombre.toLowerCase().includes(search) ||
        tenant.nit.toLowerCase().includes(search) ||
        (tenant.email || '').toLowerCase().includes(search) ||
        (tenant.telefono || '').toLowerCase().includes(search);
      const matchesStatus =
        !status ||
        (status === 'activo' && tenant.is_active) ||
        (status === 'inactivo' && !tenant.is_active);

      return matchesSearch && matchesStatus;
    });
  });

  readonly pagedTenants = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filteredTenants().slice(start, start + this.pageSize());
  });

  readonly tenantMetrics = computed<TenantMetricsResponse>(() => {
    return this.metricsQuery.data() ?? this.emptyMetrics();
  });

  readonly recentIncidents = computed(() => {
    return [...(this.incidentsQuery.data() ?? [])]
      .sort((left, right) => this.parseIncidentDate(right.fecha_reporte) - this.parseIncidentDate(left.fecha_reporte))
      .slice(0, 10);
  });

  private createEmptyTenantForm(): TenantFormData {
    return {
      nombre: '',
      nit: '',
      telefono: '',
      email: '',
      direccion: '',
      latitud: 0,
      longitud: 0,
    };
  }

  private emptyMetrics(): TenantMetricsResponse {
    return {
      total_incidentes: 0,
      incidentes_abiertos: 0,
      total_tecnicos: 0,
      sucursales_activas: 0,
    };
  }

  refreshAll(): void {
    this.tenantsQuery.refetch();
    this.refreshDetailQueries();
  }

  private refreshDetailQueries(): void {
    this.usersQuery.refetch();
    this.branchesQuery.refetch();
    this.techniciansQuery.refetch();
    this.incidentsQuery.refetch();
    this.metricsQuery.refetch();
    this.bitacoraQuery.refetch();
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.pageIndex.set(0);
  }

  onStatusFilterChange(value: string): void {
    this.statusFilter.set(value);
    this.pageIndex.set(0);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  async selectTenant(tenant: TallerTenant): Promise<void> {
    this.selectedTabIndex.set(0);
    this.verificationResult.set(null);

    try {
      const detail = await lastValueFrom(this.adminService.getTenantDetail(tenant.id_taller));
      this.selectedTenant.set(detail);
    } catch {
      this.selectedTenant.set(tenant);
    }

    this.refreshDetailQueries();
  }

  openBranchManager(branch?: SucursalResponse | null): void {
    if (branch) {
      this.selectedTabIndex.set(5);
    }

    void this.router.navigate(['/workshops/branches']);
  }

  openIncidentDetail(idIncidente: string): void {
    void this.router.navigate(['/emergencies/details', idIncidente]);
  }

  getVehicleLabel(incident: IncidenteTenant): string {
    const parts = [incident.vehicle_brand, incident.vehicle_model].filter(Boolean);
    if (parts.length > 0) {
      return parts.join(' ');
    }
    return incident.vehicle_plate || 'Vehículo sin detalle';
  }

  isIncidentClosed(status?: string | null): boolean {
    const normalized = (status || '').toLowerCase();
    return normalized.includes('complet') || normalized.includes('finaliz') || normalized.includes('cerrad');
  }

  private parseIncidentDate(value?: string | null): number {
    const parsed = value ? new Date(value).getTime() : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  }

  openCreateTenantForm(): void {
    this.tenantFormMode.set('create');
    this.tenantFormData = this.createEmptyTenantForm();
    this.showTenantForm.set(true);
  }

  openEditTenantForm(tenant: TallerTenant | null): void {
    if (!tenant) {
      return;
    }

    this.selectedTenant.set(tenant);
    this.tenantFormMode.set('edit');
    this.tenantFormData = {
      nombre: tenant.nombre,
      nit: tenant.nit,
      telefono: tenant.telefono ?? '',
      email: tenant.email ?? '',
      direccion: tenant.direccion ?? '',
      latitud: tenant.latitud ?? 0,
      longitud: tenant.longitud ?? 0,
    };
    this.showTenantForm.set(true);
  }

  saveTenant(): void {
    if (!this.tenantFormData.nombre.trim() || !this.tenantFormData.nit.trim()) {
      this.snackBar.open('Nombre y NIT son obligatorios.', 'Cerrar', { duration: 3000 });
      return;
    }

    const selectedTenant = this.selectedTenant();
    const payloadData: TallerTenantCreate = {
      nombre: this.tenantFormData.nombre.trim(),
      nit: this.tenantFormData.nit.trim(),
      telefono: this.tenantFormData.telefono?.trim() || undefined,
      email: this.tenantFormData.email?.trim() || undefined,
      direccion: this.tenantFormData.direccion?.trim() || undefined,
      is_active: this.tenantFormMode() === 'edit' ? selectedTenant?.is_active ?? true : true,
    };
    const payload = {
      idTaller: this.tenantFormMode() === 'edit' ? selectedTenant?.id_taller : undefined,
      data: payloadData,
    };

    this.tenantSaveMutation.mutate(payload);
  }

  closeTenantForm(): void {
    this.showTenantForm.set(false);
  }

  toggleTenantStatus(): void {
    const tenant = this.selectedTenant();
    if (!tenant) {
      return;
    }

    this.toggleStatusMutation.mutate({
      idTaller: tenant.id_taller,
      activo: !tenant.is_active,
    });
  }

  openUserAssociationForm(): void {
    this.userAssociationData = { id_usuario: '' };
    this.showUserAssociationForm.set(true);
  }

  closeUserAssociationForm(): void {
    this.showUserAssociationForm.set(false);
  }

  associateUser(): void {
    const tenant = this.selectedTenant();
    const idUsuario = this.userAssociationData.id_usuario.trim();

    if (!tenant) {
      return;
    }

    if (!idUsuario) {
      this.snackBar.open('Ingresa un ID de usuario vÃ¡lido.', 'Cerrar', { duration: 3000 });
      return;
    }

    this.associateUserMutation.mutate({
      idTaller: tenant.id_taller,
      idUsuario,
    });
  }

  openTechnicianAssociationForm(): void {
    this.technicianAssociationData = { id_tecnico: '' };
    this.showTechnicianAssociationForm.set(true);
  }

  closeTechnicianAssociationForm(): void {
    this.showTechnicianAssociationForm.set(false);
  }

  associateTechnician(): void {
    const tenant = this.selectedTenant();
    const idTecnico = this.technicianAssociationData.id_tecnico.trim();

    if (!tenant) {
      return;
    }

    if (!idTecnico) {
      this.snackBar.open('Ingresa un ID de tÃ©cnico vÃ¡lido.', 'Cerrar', { duration: 3000 });
      return;
    }

    this.associateTechnicianMutation.mutate({
      idTaller: tenant.id_taller,
      idTecnico,
    });
  }

  runIsolationCheck(): void {
    this.verifyIsolationMutation.mutate();
  }
}


