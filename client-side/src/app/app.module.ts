import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app.routes';
import { AppComponent } from './app.component';
import { PepUIModule } from './modules/pepperi.module';
import { MaterialModule } from './modules/material.module';
import { AddonModule } from './components/addon/index';
import { CloudWatchLogsComponent } from './components/cloud-watch-logs/cloud-watch-logs.component';

@NgModule({
    declarations: [
        AppComponent,
        CloudWatchLogsComponent,
    ],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        AppRoutingModule,
        PepUIModule,
        MaterialModule,
        AddonModule
    ],
    providers: [],
    bootstrap: [AppComponent]
})
export class AppModule {
}




