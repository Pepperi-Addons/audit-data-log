import { NgModule } from '@angular/core';
import { Component } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AuditDataLogComponent } from '../audit-data-log/audit-data-log.component';
import { CloudWatchLogsComponent } from '../cloud-watch-logs/cloud-watch-logs.component';
import { SettingsComponent } from './settings.component';

// Important for single spa
@Component({
    selector: 'app-empty-route',
    template: '<div>Route is not exist settings.</div>',
})
export class EmptyRouteComponent {}

const routes: Routes = [{
    path: ':settingsSectionName/:addon_uuid',
    component: SettingsComponent,
    children: [
        {
            path: 'audit_data_log',
            component: AuditDataLogComponent
        },
        {
            path: 'logs',
            component: CloudWatchLogsComponent
        },
        { path: '**', component: EmptyRouteComponent }
    ]
}];

@NgModule({
    imports: [
        RouterModule.forChild(routes),
    ],
    exports: [RouterModule]
})
export class SettingsRoutingModule { }



