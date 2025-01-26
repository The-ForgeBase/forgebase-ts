import React, { useState, useEffect } from 'react';
import { Trash2, Plus, Link, Edit } from 'lucide-react';
import {
  ColumnDefinition,
  ColumnType,
  ForeignKey,
  TableSchema,
} from '../types/database';
import { Label } from '@forgebase-ts/studio-ui/label';
import { Input } from '@forgebase-ts/studio-ui/input';
import { Switch } from '@forgebase-ts/studio-ui/switch';
import { Button } from '@forgebase-ts/studio-ui/button';
import { Separator } from '@forgebase-ts/studio-ui/separator';
import { ScrollArea } from '@forgebase-ts/studio-ui/scroll-area';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectValue,
  SelectItem,
} from '@forgebase-ts/studio-ui/select';
import { Card, CardContent } from '@forgebase-ts/studio-ui/card';
import { Checkbox } from '@forgebase-ts/studio-ui/checkbox';
import { Badge } from '@forgebase-ts/studio-ui/badge';
import { useToast } from '@forgebase-ts/studio-ui/hooks/use-toast';

// Dummy table data for foreign key references
const dummyTables: TableSchema = {
  users: {
    columns: [
      {
        name: 'id',
        type: 'increments',
        primary: true,
        nullable: false,
        unique: true,
      },
      { name: 'name', type: 'string', nullable: true, unique: false },
      { name: 'email', type: 'string', unique: true, nullable: true },
    ],
    foreignKeys: [],
  },
  products: {
    columns: [
      {
        name: 'id',
        type: 'integer',
        primary: true,
        nullable: false,
        unique: true,
      },
      { name: 'name', type: 'string', nullable: true, unique: false },
      { name: 'price', type: 'float', nullable: true, unique: false },
    ],
    foreignKeys: [],
  },
  orders: {
    columns: [
      {
        name: 'id',
        type: 'integer',
        primary: true,
        nullable: false,
        unique: true,
      },
      { name: 'user_id', type: 'integer', nullable: false, unique: false },
      { name: 'total', type: 'float', nullable: false, unique: false },
    ],
    foreignKeys: [],
  },
};

export const CreateTableForm = () => {
  const { toast } = useToast();
  const [tableName, setTableName] = useState('');
  const [columns, setColumns] = useState<ColumnDefinition[]>([
    {
      name: 'id',
      type: 'increments',
      primary: true,
      nullable: false,
      unique: true,
    },
  ]);
  const [newForeignKey, setNewForeignKey] = useState<ForeignKey | null>(null);
  const [editingForeignKey, setEditingForeignKey] = useState<
    | {
        columnIndex: number | undefined;
        foreignKey: ForeignKey;
      }
    | null
    | undefined
  >(null);

  const handleAddColumn = () => {
    setColumns([
      ...columns,
      { name: '', type: 'string', nullable: true, unique: false },
    ]);
  };

  const handleRemoveColumn = (index: number) => {
    setColumns(columns.filter((_, i) => i !== index));
  };

  const handleUpdateColumn = (
    index: number,
    updates: Partial<ColumnDefinition>
  ) => {
    setColumns(
      columns.map((col, i) => {
        if (i === index) {
          const updatedColumn = { ...col, ...updates };
          if (updates.foreignKey && !updatedColumn.unique) {
            updatedColumn.unique = true;
          }
          if (updates.foreignKey === undefined && col.foreignKey) {
            updatedColumn.unique = updates.unique ?? col.unique;
          }
          return updatedColumn;
        }
        return col;
      })
    );
  };

  const handleAddForeignKey = () => {
    if (newForeignKey) {
      const columnIndex = columns.findIndex(
        (col) => col.name === newForeignKey.columnName
      );
      if (columnIndex !== -1) {
        handleUpdateColumn(columnIndex, {
          foreignKey: newForeignKey,
          unique: true,
        });
        setNewForeignKey(null);
      }
    }
  };

  const handleEditForeignKey = (columnIndex: number) => {
    const column = columns[columnIndex];
    if (column.foreignKey) {
      setEditingForeignKey({
        columnIndex,
        foreignKey: { ...column.foreignKey },
      });
    }
  };

  const handleUpdateForeignKey = () => {
    if (editingForeignKey && editingForeignKey.columnIndex) {
      handleUpdateColumn(editingForeignKey.columnIndex, {
        foreignKey: editingForeignKey.foreignKey,
      });
      setEditingForeignKey(null);
    }
  };

  const handleRemoveForeignKey = (columnIndex: number) => {
    handleUpdateColumn(columnIndex, { foreignKey: undefined });
  };

  const validateForeignKeys = () => {
    let isValid = true;
    columns.forEach((column) => {
      if (column.foreignKey) {
        const { tableName, columnName } = column.foreignKey.references;
        const referencedTable = dummyTables[tableName];
        if (referencedTable) {
          const referencedColumn = referencedTable.columns.find(
            (c) => c.name === columnName
          );
          if (referencedColumn && referencedColumn.type !== column.type) {
            toast({
              title: 'Foreign Key Type Mismatch',
              description: `Column "${column.name}" type does not match referenced column "${columnName}" in table "${tableName}"`,
              variant: 'destructive',
            });
            isValid = false;
          }
        }
      }
    });
    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForeignKeys()) {
      // onCreateTable(tableName, columns);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 pr-4 pt-6 w-[700px] h-screen flex flex-col items-center justify-start"
    >
      <div className="space-y-2 w-full">
        <Label htmlFor="tableName">Table Name</Label>
        <Input
          id="tableName"
          value={tableName}
          onChange={(e) => setTableName(e.target.value)}
          placeholder="Enter table name"
          required
          className="w-full"
        />
      </div>

      <div className="space-y-2 w-full">
        <Label>Columns</Label>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {columns.map((column, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex items-start space-x-2">
                    <div className="flex-1 space-y-3">
                      <Input
                        value={column.name}
                        onChange={(e) =>
                          handleUpdateColumn(index, {
                            name: e.target.value,
                          })
                        }
                        placeholder="Column name"
                        disabled={index === 0}
                      />
                      <div className="flex gap-2">
                        {index === 0 ? (
                          <Select
                            value={column.type}
                            onValueChange={(
                              value: 'increments' | 'uuid' | 'string'
                            ) => handleUpdateColumn(index, { type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="increments">
                                Increments
                              </SelectItem>
                              <SelectItem value="uuid">UUID</SelectItem>
                              <SelectItem value="string">String</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Select
                            value={column.type}
                            onValueChange={(value: ColumnType) =>
                              handleUpdateColumn(index, { type: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="increments">
                                Increments
                              </SelectItem>
                              <SelectItem value="string">String</SelectItem>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="integer">Integer</SelectItem>
                              <SelectItem value="bigInteger">
                                Big Integer
                              </SelectItem>
                              <SelectItem value="boolean">Boolean</SelectItem>
                              <SelectItem value="decimal">Decimal</SelectItem>
                              <SelectItem value="float">Float</SelectItem>
                              <SelectItem value="datetime">DateTime</SelectItem>
                              <SelectItem value="date">Date</SelectItem>
                              <SelectItem value="time">Time</SelectItem>
                              <SelectItem value="timestamp">
                                Timestamp
                              </SelectItem>
                              <SelectItem value="binary">Binary</SelectItem>
                              <SelectItem value="json">JSON</SelectItem>
                              <SelectItem value="uuid">UUID</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        <div className="flex items-center space-x-2">
                          <Switch
                            id={`nullable-${index}`}
                            checked={column.nullable}
                            onCheckedChange={(checked) =>
                              handleUpdateColumn(index, {
                                nullable: checked,
                              })
                            }
                            disabled={index === 0}
                          />
                          <Label htmlFor={`nullable-${index}`}>Nullable</Label>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`primary-${index}`}
                            checked={column.primary}
                            onCheckedChange={(checked) =>
                              handleUpdateColumn(index, {
                                primary: checked as boolean,
                              })
                            }
                            disabled={index === 0}
                          />
                          <Label htmlFor={`primary-${index}`}>Primary</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`unique-${index}`}
                            checked={column.unique || !!column.foreignKey}
                            onCheckedChange={(checked) =>
                              handleUpdateColumn(index, {
                                unique: checked as boolean,
                              })
                            }
                            disabled={!!column.foreignKey}
                          />
                          <Label htmlFor={`unique-${index}`}>Unique</Label>
                        </div>
                      </div>
                      {index !== 0 && (
                        <div>
                          <Label htmlFor={`default-${index}`}>
                            Default Value
                          </Label>
                          <Input
                            id={`default-${index}`}
                            value={column.default || ''}
                            onChange={(e) =>
                              handleUpdateColumn(index, {
                                default: e.target.value,
                              })
                            }
                            placeholder="Default value"
                          />
                        </div>
                      )}
                      {column.foreignKey && (
                        <div className="mt-2 flex items-center space-x-2">
                          <Badge
                            variant="secondary"
                            className="bg-green-100 text-green-800"
                          >
                            Foreign Key:{' '}
                            {column.foreignKey.references.tableName}.
                            {column.foreignKey.references.columnName}
                          </Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditForeignKey(index)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveForeignKey(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    {index !== 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveColumn(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleAddColumn}
        className="w-full"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Column
      </Button>

      <Separator />

      <div className="space-y-4 w-full">
        <Label>
          {editingForeignKey ? 'Edit Foreign Key' : 'Add Foreign Key'}
        </Label>
        <div className="flex space-x-2">
          <Select
            value={
              (editingForeignKey?.foreignKey || newForeignKey)?.columnName ||
              undefined
            }
            onValueChange={(value) => {
              if (editingForeignKey) {
                setEditingForeignKey({
                  ...editingForeignKey,
                  foreignKey: {
                    ...editingForeignKey.foreignKey,
                    columnName: value,
                  },
                });
              } else {
                setNewForeignKey({
                  ...newForeignKey,
                  columnName: value,
                } as ForeignKey);
              }
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select column" />
            </SelectTrigger>
            <SelectContent>
              {columns
                .filter((column) => column.name !== '')
                .map((column) => (
                  <SelectItem key={column.name} value={column.name}>
                    {column.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Select
            value={
              (editingForeignKey?.foreignKey || newForeignKey)?.references
                ?.tableName || undefined
            }
            onValueChange={(value) => {
              if (editingForeignKey) {
                setEditingForeignKey({
                  ...editingForeignKey,
                  foreignKey: {
                    ...editingForeignKey.foreignKey,
                    references: {
                      ...editingForeignKey.foreignKey.references,
                      tableName: value,
                      columnName: '',
                    },
                  },
                });
              } else {
                setNewForeignKey({
                  ...newForeignKey,
                  references: {
                    ...newForeignKey?.references,
                    tableName: value,
                    columnName: '',
                  },
                } as ForeignKey);
              }
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select referenced table" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(dummyTables).map((tableName) => (
                <SelectItem key={tableName} value={tableName}>
                  {tableName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={
              (editingForeignKey?.foreignKey || newForeignKey)?.references
                ?.columnName || undefined
            }
            onValueChange={(value) => {
              if (editingForeignKey) {
                setEditingForeignKey({
                  ...editingForeignKey,
                  foreignKey: {
                    ...editingForeignKey.foreignKey,
                    references: {
                      ...editingForeignKey.foreignKey.references,
                      columnName: value,
                    },
                  },
                });
              } else {
                setNewForeignKey({
                  ...newForeignKey,
                  references: {
                    ...newForeignKey?.references,
                    columnName: value,
                  },
                } as ForeignKey);
              }
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select referenced column" />
            </SelectTrigger>
            <SelectContent>
              {(editingForeignKey?.foreignKey || newForeignKey)?.references
                ?.tableName &&
                dummyTables[
                  (editingForeignKey?.foreignKey! || newForeignKey).references
                    .tableName
                ]?.columns
                  .filter((col: any) => col.name !== '')
                  .map((col: any) => (
                    <SelectItem key={col.name} value={col.name}>
                      {col.name}
                    </SelectItem>
                  ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            onClick={
              editingForeignKey ? handleUpdateForeignKey : handleAddForeignKey
            }
            disabled={
              !(editingForeignKey?.foreignKey || newForeignKey)?.columnName ||
              !(editingForeignKey?.foreignKey || newForeignKey)?.references
                ?.tableName ||
              !(editingForeignKey?.foreignKey || newForeignKey)?.references
                ?.columnName
            }
          >
            {editingForeignKey ? 'Update Foreign Key' : 'Add Foreign Key'}
          </Button>
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="submit">Create Table</Button>
      </div>
    </form>
  );
};
