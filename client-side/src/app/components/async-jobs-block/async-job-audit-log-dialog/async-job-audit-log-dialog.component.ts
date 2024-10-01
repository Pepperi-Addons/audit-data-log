import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'addon-async-job-audit-log-dialog',
  templateUrl: './async-job-audit-log-dialog.component.html',
  styleUrls: ['./async-job-audit-log-dialog.component.scss']
})
export class AsyncJobAuditLogDialogComponent {

  constructor(
    private dialogRef: MatDialogRef<AsyncJobAuditLogDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {}
  ) {
  }

  closeClicked() {
    this.dialogRef.close();
  }

}

