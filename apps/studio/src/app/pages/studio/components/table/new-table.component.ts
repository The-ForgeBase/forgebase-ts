import { Component, input, output } from '@angular/core';

@Component({
  selector: 'studio-new-table',
  standalone: true,
  host: {
    class: 'block w-full h-full',
  },
  imports: [],
  template: `
    <div class="flex flex-col gap-2 w-full">
      <button
        type="button"
        class="bg-blue-500 text-white rounded p-2 hover:bg-blue-600"
      >
        Create Table
      </button>
    </div>
  `,
})
export class NewTableComponent {
  close = output();
  tables = input.required<string[]>();
  showSystemTables = input<boolean>(false);
}
