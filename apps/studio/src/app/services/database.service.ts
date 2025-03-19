import { Injectable, signal } from '@angular/core';

@Injectable()
export class DatabaseService {
  private tables = signal<string[]>([]);

  getTables() {
    return this.tables();
  }

  addTable(table: string) {
    this.tables.update((tables) => [...tables, table]);
  }

  removeTable(table: string) {
    this.tables.update((tables) => tables.filter((t) => t !== table));
  }
}
