import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NestedDocEntry } from '../../utils/structures';

@Component({
  selector: 'app-nav-tree',
  standalone: true,
  template: `
    <div class="item">
      <a [routerLink]="['/docs', framework()]">{{ title() }}</a>
    </div>
    @for (section of sections(); track section.name) {
    <div class="section">
      @if(section.filename && !section.children?.length) {
      <div class="item" (click)="toggleSection(section)">
        <a [routerLink]="['/docs', framework(), section.attributes.slug]">{{
          section.attributes.title || section.name
        }}</a>
      </div>
      } @else {
      <div class="section-header" (click)="toggleSection(section)">
        {{ section.name }} {{ section.children?.length ? '▾' : '' }}
      </div>
      } @if (section.isOpen && section.children?.length) {
      <div class="section-children">
        @for (item of section.children; track item.name) {
        <!--  -->
        @if (!item.children?.length) {
        <!-- Direct file entry -->
        <div class="item">
          <a [routerLink]="['/docs', section.slug, item.slug]">{{
            item.attributes.title || item.name
          }}</a>
        </div>
        } @else {
        <!-- Nested section - render as a separate section -->
        @if(item.children?.length){
        <app-nav-tree
          [sections]="item?.children!"
          [name]="item.name"
          [slug]="item.slug"
          [title]="item.attributes.title"
          [framework]="framework() + '/' + item.attributes.framework!"
        ></app-nav-tree>
        } @else {
        <div class="item">
          <a [routerLink]="['/docs', section.slug, item.slug]">{{
            item.attributes.title || item.name
          }}</a>
        </div>
        } } }
      </div>
      }
    </div>
    }
  `,
  imports: [CommonModule, RouterModule],
})
export class NavTreeComponent {
  readonly sections = input<NestedDocEntry[]>([]);
  readonly name = input<string>('');
  readonly slug = input<string>('');
  readonly title = input<string>('');
  readonly framework = input<string>('');

  toggleSection(section: NestedDocEntry) {
    section.isOpen = !section.isOpen;
  }
}
