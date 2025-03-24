this is the schema response example `http://localhost:8000/api/db/schema/tables/${this.tableName}`,

{"name":"users","info":{"columns":[{"name":"id","table":"users","data_type":"char","default_value":"lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))","max_length":36,"numeric_precision":null,"numeric_scale":null,"is_generated":false,"generation_expression":null,"is_nullable":true,"is_unique":true,"is_primary_key":true,"has_auto_increment":false,"foreign_key_column":null,"foreign_key_table":null},{"name":"email","table":"users","data_type":"varchar","default_value":null,"max_length":255,"numeric_precision":null,"numeric_scale":null,"is_generated":false,"generation_expression":null,"is_nullable":true,"is_unique":false,"is_primary_key":false,"has_auto_increment":false,"foreign_key_column":null,"foreign_key_table":null},{"name":"phone","table":"users","data_type":"varchar","default_value":null,"max_length":255,"numeric_precision":null,"numeric_scale":null,"is_generated":false,"generation_expression":null,"is_nullable":true,"is_unique":true,"is_primary_key":false,"has_auto_increment":false,"foreign_key_column":null,"foreign_key_table":null},{"name":"name","table":"users","data_type":"varchar","default_value":null,"max_length":255,"numeric_precision":null,"numeric_scale":null,"is_generated":false,"generation_expression":null,"is_nullable":true,"is_unique":false,"is_primary_key":false,"has_auto_increment":false,"foreign_key_column":null,"foreign_key_table":null},{"name":"picture","table":"users","data_type":"varchar","default_value":null,"max_length":255,"numeric_precision":null,"numeric_scale":null,"is_generated":false,"generation_expression":null,"is_nullable":true,"is_unique":false,"is_primary_key":false,"has_auto_increment":false,"foreign_key_column":null,"foreign_key_table":null},{"name":"password_hash","table":"users","data_type":"varchar","default_value":null,"max_length":255,"numeric_precision":null,"numeric_scale":null,"is_generated":false,"generation_expression":null,"is_nullable":true,"is_unique":false,"is_primary_key":false,"has_auto_increment":false,"foreign_key_column":null,"foreign_key_table":null},{"name":"email_verified","table":"users","data_type":"boolean","default_value":"0","max_length":null,"numeric_precision":null,"numeric_scale":null,"is_generated":false,"generation_expression":null,"is_nullable":true,"is_unique":false,"is_primary_key":false,"has_auto_increment":false,"foreign_key_column":null,"foreign_key_table":null},{"name":"phone_verified","table":"users","data_type":"boolean","default_value":"0","max_length":null,"numeric_precision":null,"numeric_scale":null,"is_generated":false,"generation_expression":null,"is_nullable":true,"is_unique":false,"is_primary_key":false,"has_auto_increment":false,"foreign_key_column":null,"foreign_key_table":null},{"name":"mfa_enabled","table":"users","data_type":"boolean","default_value":"0","max_length":null,"numeric_precision":null,"numeric_scale":null,"is_generated":false,"generation_expression":null,"is_nullable":true,"is_unique":false,"is_primary_key":false,"has_auto_increment":false,"foreign_key_column":null,"foreign_key_table":null},{"name":"mfa_secret","table":"users","data_type":"varchar","default_value":null,"max_length":255,"numeric_precision":null,"numeric_scale":null,"is_generated":false,"generation_expression":null,"is_nullable":true,"is_unique":false,"is_primary_key":false,"has_auto_increment":false,"foreign_key_column":null,"foreign_key_table":null},{"name":"mfa_recovery_codes","table":"users","data_type":"json","default_value":null,"max_length":null,"numeric_precision":null,"numeric_scale":null,"is_generated":false,"generation_expression":null,"is_nullable":true,"is_unique":false,"is_primary_key":false,"has_auto_increment":false,"foreign_key_column":null,"foreign_key_table":null},{"name":"last_login_at","table":"users","data_type":"datetime","default_value":null,"max_length":null,"numeric_precision":null,"numeric_scale":null,"is_generated":false,"generation_expression":null,"is_nullable":true,"is_unique":false,"is_primary_key":false,"has_auto_increment":false,"foreign_key_column":null,"foreign_key_table":null},{"name":"created_at","table":"users","data_type":"datetime","default_value":"CURRENT_TIMESTAMP","max_length":null,"numeric_precision":null,"numeric_scale":null,"is_generated":false,"generation_expression":null,"is_nullable":false,"is_unique":false,"is_primary_key":false,"has_auto_increment":false,"foreign_key_column":null,"foreign_key_table":null},{"name":"updated_at","table":"users","data_type":"datetime","default_value":"CURRENT_TIMESTAMP","max_length":null,"numeric_precision":null,"numeric_scale":null,"is_generated":false,"generation_expression":null,"is_nullable":false,"is_unique":false,"is_primary_key":false,"has_auto_increment":false,"foreign_key_column":null,"foreign_key_table":null}],"foreignKeys":[]}}

this is the db data example `http://localhost:8000/api/db/${this.tableName}`,

[{"id":"2a7d381b-aec5-4c87-a2bf-2145f5283457","email":"admin@yourdomain.com","name":"Initial Admin","password_hash":"$argon2id$v=19$m=19456,t=2,p=1$Lsgy6Qz7iDrMgq4J6S7RkQ$2y7DhhQg/STJ1wZwpQegsEV+SnTj406/1yrIaQEmyRg","role":"super_admin","permissions":"[object Object]","is_super_admin":1,"last_login_at":"2025-03-19 08:10:11","created_at":"2025-03-19 08:06:46","updated_at":"2025-03-19 08:10:11"}]

this is a data table Implementation example

import { Component, OnInit } from '@angular/core';
import { MessageService, SelectItem } from 'primeng/api';
import { Product } from '@/domain/product';
import { ProductService } from '@/service/productservice';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { CommonModule } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

@Component({
selector: 'table-row-edit-demo',
templateUrl: `
<div class="card">
<p-toast />
<p-table [value]="products" dataKey="id" editMode="row" [tableStyle]="{'min-width': '50rem'}">
<ng-template #header>
<tr>
<th style="width:20%">Code</th>
<th style="width:20%">Name</th>
<th style="width:20%">Inventory Status</th>
<th style="width:20%">Price</th>
<th style="width:20%"></th>
</tr>
</ng-template>
<ng-template #body let-product let-editing="editing" let-ri="rowIndex">
<tr [pEditableRow]="product">
<td>
<p-cellEditor>
<ng-template #input>
<input
pInputText type="text"
[(ngModel)]="product.code" />
</ng-template>
<ng-template #output>
{{product.code}}
</ng-template>
</p-cellEditor>
</td>
<td>
<p-cellEditor>
<ng-template #input>
<input
pInputText type="text"
[(ngModel)]="product.name"
required />
</ng-template>
<ng-template #output>
{{product.name}}
</ng-template>
</p-cellEditor>
</td>
<td>
<p-cellEditor>
<ng-template #input>
<p-select
[options]="statuses"
appendTo="body"
[(ngModel)]="product.inventoryStatus"
[style]="{'width':'100%'}" />
</ng-template>
<ng-template #output>
<p-tag
[value]="product.inventoryStatus"
[severity]="getSeverity(product.inventoryStatus)" />
</ng-template>
</p-cellEditor>
</td>
<td>
<p-cellEditor>
<ng-template #input>
<input
pInputText type="text"
[(ngModel)]="product.price" />
</ng-template>
<ng-template #output>
{{product.price | currency: 'USD'}}
</ng-template>
</p-cellEditor>
</td>
<td>
<div class="flex items-center justify-center gap-2">
<button
*ngIf="!editing"
pButton
pRipple
type="button"
pInitEditableRow
icon="pi pi-pencil"
(click)="onRowEditInit(product)"
text
rounded
severity="secondary" ></button>
<button
*ngIf="editing"
pButton
pRipple
type="button"
pSaveEditableRow
icon="pi pi-check"
(click)="onRowEditSave(product)"
text
rounded
severity="secondary" ></button>
<button
\*ngIf="editing"
pButton
pRipple
type="button"
pCancelEditableRow
icon="pi pi-times"
(click)="onRowEditCancel(product, ri)"
text
rounded
severity="secondary" ></button>
</div>
</td>
</tr>
</ng-template>
</p-table>

</div>
    `,
    standalone: true,
    imports: [TableModule, ToastModule, CommonModule, TagModule, SelectModule, ButtonModule, InputTextModule],
    providers: [MessageService, ProductService]
})
export class TableRowEditDemo implements OnInit{

    products!: Product[];

    statuses!: SelectItem[];

    clonedProducts: { [s: string]: Product } = {};

    constructor(private productService: ProductService, private messageService: MessageService) {}

    ngOnInit() {
        this.productService.getProductsMini().then((data) => {
            this.products = data;
        });

        this.statuses = [
            { label: 'In Stock', value: 'INSTOCK' },
            { label: 'Low Stock', value: 'LOWSTOCK' },
            { label: 'Out of Stock', value: 'OUTOFSTOCK' }
        ];
    }

    onRowEditInit(product: Product) {
        this.clonedProducts[product.id as string] = { ...product };
    }

    onRowEditSave(product: Product) {
        if (product.price > 0) {
            delete this.clonedProducts[product.id as string];
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Product is updated' });
        } else {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Invalid Price' });
        }
    }

    onRowEditCancel(product: Product, index: number) {
        this.products[index] = this.clonedProducts[product.id as string];
        delete this.clonedProducts[product.id as string];
    }

    getSeverity(status: string) {
        switch (status) {
            case 'INSTOCK':
                return 'success';
            case 'LOWSTOCK':
                return 'warn';
            case 'OUTOFSTOCK':
                return 'danger';
        }
    }

}
