import {
  type CdkCellDef,
  CdkColumnDef,
  type CdkFooterCellDef,
  type CdkHeaderCellDef,
  CdkTableModule,
} from '@angular/cdk/table';
import {
  type AfterContentChecked,
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  ElementRef,
  Input,
  ViewChild,
  ViewEncapsulation,
  inject,
  input,
} from '@angular/core';
import { BrnCellDefDirective } from './brn-cell-def.directive';
import { BrnFooterDefDirective } from './brn-footer-def.directive';
import { BrnHeaderDefDirective } from './brn-header-def.directive';

@Component({
  selector: 'brn-column-def',
  imports: [CdkTableModule],
  template: `
    <ng-container [cdkColumnDef]="name">
      <ng-content select="[brnHeaderDef]" />
      <ng-content select="[brnCellDef]" />
      <ng-content select="[brnFooterDef]" />
    </ng-container>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class BrnColumnDefComponent implements AfterContentChecked {
  constructor(private readonly elementRef: ElementRef) {}

  private _findParentTable(): any {
    let element = this.elementRef.nativeElement.parentElement;
    while (element) {
      if (element.tagName && element.tagName.toLowerCase() === 'brn-table') {
        // Don't rely on __ngContext__ which seems to be causing issues
        // Instead, you can use Angular's DI to get references
        return element;
      }
      element = element.parentElement;
    }
    return null;
  }
  public get columnDef() {
    return this._columnDef;
  }

  public get cell() {
    return this._columnDef.cell;
  }

  private _name = '';
  @Input()
  public get name(): string {
    return this._name;
  }

  public set name(value: string) {
    this._name = value;
    if (!this._columnDef) return;
    this._columnDef.name = value;
  }

  public readonly class = input('');

  @ViewChild(CdkColumnDef, { static: true })
  private readonly _columnDef!: CdkColumnDef;

  @ContentChild(BrnCellDefDirective, { static: true })
  private readonly _cellDef?: CdkCellDef;
  @ContentChild(BrnFooterDefDirective, { static: true })
  private readonly _footerCellDef?: CdkFooterCellDef;
  @ContentChild(BrnHeaderDefDirective, { static: true })
  private readonly _headerCellDef?: CdkHeaderCellDef;
  @Input()
  public dynamic = false;

  public ngAfterContentChecked(): void {
    this._columnDef.name = this.name;
    if (this._cellDef) {
      this._columnDef.cell = this._cellDef;
    }
    if (this._headerCellDef) {
      this._columnDef.headerCell = this._headerCellDef;
    }
    if (this._footerCellDef) {
      this._columnDef.footerCell = this._footerCellDef;
    }
    // if (this.dynamic) {
    //   // Find the parent table and add this column definition to it
    //   const table = this._findParentTable();
    //   if (table && table._cdkTable) {
    //     table._cdkTable.addColumnDef(this._columnDef);
    //   }
    // }
  }
}
