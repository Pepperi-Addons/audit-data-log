import { NgModule, Injector, DoBootstrap } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { TranslateLoader, TranslateModule, TranslateService, TranslateStore } from '@ngx-translate/core';

import { AppComponent } from './app.component';
import { PepUIModule } from './modules/pepperi.module';
import { MaterialModule } from './modules/material.module';
import { CloudWatchLogsComponent } from './components/cloud-watch-logs/cloud-watch-logs.component';
import { AuditDataLogComponent } from './components/audit-data-log/audit-data-log.component';
import { AuditDataLogBlockModule } from './components/audit-data-log-block/audit-data-log-block.module';

import { AppRoutingModule } from './app.routes';
import { config } from './addon.config';
import { PepAddonService } from '@pepperi-addons/ngx-lib';
import { SettingsComponent } from './components/settings';
import { AuditDataLogBlockComponent } from './components/audit-data-log-block';

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
        AuditDataLogBlockModule,
        TranslateModule.forRoot({
            loader: {
                provide: TranslateLoader,
                useFactory: (addonService: PepAddonService) => 
                    PepAddonService.createMultiTranslateLoader(config.AddonUUID, addonService, ['ngx-lib']),
                deps: [PepAddonService]
            }
        }),
    ],
    providers: [
        TranslateStore
    ],
    bootstrap: [
        // AppComponent
    ]
})
export class AppModule implements DoBootstrap {
    constructor(
        private injector: Injector,
        translate: TranslateService,
        private pepAddonService: PepAddonService
    ) {
        this.pepAddonService.setDefaultTranslateLang(translate);
    }

    ngDoBootstrap() {
        this.pepAddonService.defineCustomElement(`block-element-${config.AddonUUID}`, AuditDataLogBlockComponent, this.injector);
        this.pepAddonService.defineCustomElement(`settings-element-${config.AddonUUID}`, SettingsComponent, this.injector);
    }

    
}




