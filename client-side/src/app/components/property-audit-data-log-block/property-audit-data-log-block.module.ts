import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PropertyAuditDataLogBlockComponent } from './property-audit-data-log-block.component';
import { PepDialogModule } from '@pepperi-addons/ngx-lib/dialog';
import { TranslateLoader, TranslateModule, TranslateService, TranslateStore } from '@ngx-translate/core';
import { PepAddonService } from '@pepperi-addons/ngx-lib';
import { config } from 'src/app/addon.config';
import { PepGenericListModule } from '@pepperi-addons/ngx-composite-lib/generic-list';
import { PepNgxCompositeLibModule } from '@pepperi-addons/ngx-composite-lib';



@NgModule({
  declarations: [PropertyAuditDataLogBlockComponent],
  imports: [
    CommonModule,
    PepDialogModule,
    PepNgxCompositeLibModule,
    PepGenericListModule,
    TranslateModule.forChild({
      loader: {
        provide: TranslateLoader,
        useFactory: (addonService: PepAddonService) =>
          PepAddonService.createMultiTranslateLoader(config.AddonUUID, addonService, ['ngx-lib']),
        deps: [PepAddonService]
      }, isolate: false
    }),
  ],
  providers: [TranslateStore]
})
export class PropertyAuditDataLogBlockModule {
  constructor(
    translate: TranslateService,
    private pepAddonService: PepAddonService
  ) {
    this.pepAddonService.setDefaultTranslateLang(translate);
  }
}
