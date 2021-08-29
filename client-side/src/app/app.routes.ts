import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { EmptyRouteComponent } from './components/empty-route/empty-route.component';
import { AddonComponent } from './components/addon/addon.component';
import { AuditDataLogComponent } from './components/audit-data-log/audit-data-log.component';
import { CloudWatchLogsComponent } from './components/cloud-watch-logs/cloud-watch-logs.component';
// import * as config from '../../../addon.config.json';

const routes: Routes = [
    {
        path: `settings/:addon_uuid`,

        children: [
            {
                path: 'audit_data_log',
                component: AuditDataLogComponent
            },
            {
                path: 'logs',
                component: CloudWatchLogsComponent
            }
        ]
    },
    {
        path: '**',
        component: EmptyRouteComponent
    }
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule { }
