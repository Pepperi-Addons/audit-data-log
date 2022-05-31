import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app.routes';
import { AppComponent } from './app.component';
import { PepUIModule } from './modules/pepperi.module';
import { MaterialModule } from './modules/material.module';
import { CloudWatchLogsComponent } from './components/cloud-watch-logs/cloud-watch-logs.component';
import { AuditDataLogComponent } from './components/audit-data-log/audit-data-log.component';
import { AuditDataLogBlockModule } from './components/audit-data-log-block/audit-data-log-block.module';

@NgModule({
    declarations: [
        AppComponent,
        CloudWatchLogsComponent,
        AuditDataLogComponent
    ],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        AppRoutingModule,
        PepUIModule,
        MaterialModule,
        AuditDataLogBlockModule
    ],
    providers: [],
    bootstrap: [AppComponent]
})
export class AppModule {
}




