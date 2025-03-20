import { Injectable, signal } from '@angular/core';

@Injectable()
export class DatabaseService {
  private tables = signal<string[]>([]);
  containerWidth = signal<number>(0);

  getTables() {
    return this.tables();
  }

  addTable(table: string) {
    this.tables.update((tables) => [...tables, table]);
  }

  removeTable(table: string) {
    this.tables.update((tables) => tables.filter((t) => t !== table));
  }

  setContainerWidth(width: any) {
    this.containerWidth.set(width);
  }
}
