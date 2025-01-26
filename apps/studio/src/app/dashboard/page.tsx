'use client';

import { AppSidebar } from 'apps/studio/src/components/app-sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@forgebase-ts/studio-ui/breadcrumb';
import { Separator } from '@forgebase-ts/studio-ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@forgebase-ts/studio-ui/sidebar';
import { TableSchemaAPI } from '../../types/database';
import { useOpenCreateTable, useSchema } from '../../stores/database';
import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@forgebase-ts/studio-ui/sheet';
import { Button } from '@forgebase-ts/studio-ui/button';
import { Plus } from 'lucide-react';
import { CreateTableForm } from '../../components/create-table-form';
import { ScrollArea } from '@forgebase-ts/studio-ui/scroll-area';

const initialSchema: TableSchemaAPI = {
  users: {
    columns: [
      {
        name: 'id',
        table: 'users',
        data_type: 'increments',
        default_value: null,
        max_length: null,
        numeric_precision: null,
        numeric_scale: null,
        is_generated: false,
        generation_expression: null,
        is_nullable: false,
        is_unique: true,
        is_primary_key: true,
        has_auto_increment: true,
        foreign_key_column: null,
        foreign_key_table: null,
      },
      {
        name: 'name',
        table: 'users',
        data_type: 'text',
        default_value: null,
        max_length: 255,
        numeric_precision: null,
        numeric_scale: null,
        is_generated: false,
        generation_expression: null,
        is_nullable: true,
        is_unique: false,
        is_primary_key: false,
        has_auto_increment: false,
        foreign_key_column: null,
        foreign_key_table: null,
      },
    ],
    foreignKeys: [],
  },
};

export default function Page() {
  const { schemaState, setSchema } = useSchema();
  const { setOpenCreateTable, openCreateTable } = useOpenCreateTable();

  React.useEffect(() => {
    setSchema(initialSchema);
  }, []);
  return (
    <>
      <SidebarProvider
        style={
          {
            '--sidebar-width': '350px',
          } as React.CSSProperties
        }
      >
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 flex shrink-0 items-center gap-2 border-b bg-background p-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">All Inboxes</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Inbox</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4">
            {Array.from({ length: 24 }).map((_, index) => (
              <div
                key={index}
                className="aspect-video h-12 w-full rounded-lg bg-muted/50"
              />
            ))}
          </div>
          <Sheet
            open={openCreateTable}
            onOpenChange={(op) => setOpenCreateTable(op)}
          >
            <SheetContent className="w-[740px]">
              <SheetHeader>
                <SheetTitle>Create New Table</SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-screen w-full">
                <CreateTableForm />
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}
