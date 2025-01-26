import { atom, useAtom } from 'jotai'
import { TableSchema, TableSchemaAPI } from '../types/database'

const selectedTableState = atom<string>('')
const schema = atom<TableSchemaAPI>({})
const openCreateTableState = atom(false)

export const useSelectedTable = () => {
    const [selectedTable, setSelectedTable] = useAtom(selectedTableState)

    return {
        selectedTable,
        setSelectedTable
    }
}

export const useSchema = () => {
    const [schemaState, setSchema] = useAtom(schema)
    
    return {
        schemaState,
        setSchema
    }
}

export const useOpenCreateTable = () => {
    const [openCreateTable, setOpenCreateTable] = useAtom(openCreateTableState)
    
    return {
        openCreateTable,
        setOpenCreateTable
    }
}