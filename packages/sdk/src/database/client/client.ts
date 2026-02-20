/* eslint-disable prefer-const */
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

type FieldKeys<T> = keyof T;

export type WhereOperator =
  | '='
  | '!='
  | '>'
  | '>='
  | '<'
  | '<='
  | 'like'
  | 'in'
  | 'not in'
  | 'between'
  | 'is null'
  | 'is not null';

export type GroupOperator = 'AND' | 'OR';

export interface WhereClause<T> {
  field: FieldKeys<T>;
  operator: WhereOperator;
  value: any;
  boolean?: GroupOperator;
}

export interface WhereGroup<T> {
  type: GroupOperator;
  clauses: (WhereClause<T> | WhereGroup<T>)[];
}

export interface WhereBetweenClause<T> {
  field: FieldKeys<T>;
  operator: 'between';
  value: [any, any];
  boolean?: GroupOperator;
}

export interface OrderByClause<T> {
  field: FieldKeys<T>;
  direction?: 'asc' | 'desc';
  nulls?: 'first' | 'last';
}

export interface RawExpression {
  sql: string;
  bindings?: any[];
}

export interface HavingClause<T> {
  field: FieldKeys<T>;
  operator: WhereOperator;
  value: any;
}

export interface AggregateOptions<T> {
  type: 'count' | 'sum' | 'avg' | 'min' | 'max';
  field: FieldKeys<T> | '*';
  alias?: string;
}

export interface WindowFunction<T> {
  type:
    | 'row_number'
    | 'rank'
    | 'dense_rank'
    | 'lag'
    | 'lead'
    | 'first_value'
    | 'last_value'
    | 'sum'
    | 'avg'
    | 'count'
    | 'min'
    | 'max'
    | 'nth_value'
    | 'ntile';
  field?: FieldKeys<T>;
  alias: string;
  partitionBy?: FieldKeys<T>[];
  orderBy?: OrderByClause<T>[];
  frameClause?: string;
}

export interface CTE<T extends Record<string, any>> {
  name: string;
  query: QueryBuilder<T>;
  columns?: FieldKeys<T>[];
}

export interface TransformConfig<T> {
  groupBy?: string[];
  pivot?: {
    column: string;
    values: string[];
    aggregate: AggregateOptions<T>;
  };
  flatten?: boolean;
  select?: FieldKeys<T>[];
  compute?: Record<string, (row: any) => any>;
}

export interface ExplainOptions {
  analyze?: boolean;
  verbose?: boolean;
  format?: 'text' | 'json';
}

export interface RecursiveCTE<T extends Record<string, any>> extends CTE<T> {
  isRecursive: true;
  initialQuery: QueryBuilder<T>;
  recursiveQuery: QueryBuilder<T>;
  unionAll?: boolean;
}

export interface WindowFunctionAdvanced<T> extends WindowFunction<T> {
  over?: {
    partitionBy?: FieldKeys<T>[];
    orderBy?: OrderByClause<T>[];
    frame?: {
      type: 'ROWS' | 'RANGE';
      start: 'UNBOUNDED PRECEDING' | 'CURRENT ROW' | number;
      end?: 'UNBOUNDED FOLLOWING' | 'CURRENT ROW' | number;
    };
  };
  filter?: WhereClause<T>[];
}

export interface CacheConfig<T extends Record<string, any>> {
  ttl: number;
  key?: string;
  tags?: string[];
  condition?: (params: QueryParams<T>) => boolean;
}

export interface QueryValidation {
  rules: {
    maxLimit?: number;
    requiredFields?: string[];
    disallowedFields?: string[];
    maxComplexity?: number;
  };
  suggestions?: boolean;
}

export interface QueryParams<T extends Record<string, any>> {
  filter?: Partial<T>;
  whereRaw?: WhereClause<T>[];
  whereBetween?: WhereBetweenClause<T>[];
  whereNull?: FieldKeys<T>[];
  whereNotNull?: FieldKeys<T>[];
  whereIn?: { [K in FieldKeys<T>]?: any[] };
  whereNotIn?: { [K in FieldKeys<T>]?: any[] };
  whereExists?: SubQueryConfig[];
  whereGroups?: WhereGroup<T>[];
  orderBy?: OrderByClause<T>[];
  groupBy?: FieldKeys<T>[];
  having?: HavingClause<T>[];
  aggregates?: AggregateOptions<T>[];
  // rawExpressions removed for security reasons
  limit?: number;
  offset?: number;
  windowFunctions?: WindowFunction<T>[];
  ctes?: CTE<T>[];
  transforms?: TransformConfig<T>;
  explain?: ExplainOptions;
  recursiveCtes?: RecursiveCTE<T>[];
  advancedWindows?: WindowFunctionAdvanced<T>[];
  select?: (FieldKeys<T> | '*')[];
}

// Add this interface for subquery configurations
export interface SubQueryConfig {
  tableName: string;
  params: QueryParams<any>;
  joinCondition?: {
    leftField: string;
    operator: WhereOperator;
    rightField: string;
  };
}

export interface QueryOptions {
  execute?: boolean;
}

export interface ApiResponse<T extends Record<string, any>> {
  records?: T[];
  params?: QueryParams<T>;
  message?: string;
  error?: string;
  id?: number;
}

export interface AuthInterceptors {
  request: (config: any) => Promise<any> | any;
  response: {
    onFulfilled: (response: any) => Promise<any> | any;
    onRejected: (error: any) => Promise<any> | any;
  };
}

export class DatabaseSDK<
  Schema extends Record<string, any> = any,
  CreatedSchema extends Record<string, any> = any,
> {
  private baseUrl: string;
  private axiosInstance?: AxiosInstance;
  private customFetch?: typeof fetch;

  /**
   * Create a new DatabaseSDK instance
   * @param baseUrl The base URL for API requests
   * @param axiosInstance Optional custom axios instance (e.g., from ForgebaseAuth)
   * @param axiosConfig Optional axios configuration
   * @param authInterceptors Optional auth interceptors to apply to the axios instance
   */
  constructor(options: {
    baseUrl: string;
    axiosInstance?: AxiosInstance;
    axiosConfig?: AxiosRequestConfig;
    authInterceptors?: AuthInterceptors;
    fetch?: typeof fetch;
  }) {
    let {
      baseUrl,
      axiosInstance,
      axiosConfig,
      authInterceptors,
      fetch: customFetch,
    } = options;
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash if present
    this.customFetch = customFetch;

    if (!axiosConfig) {
      axiosConfig = {};
    }

    // Use the provided axios instance or create a new one
    if (!this.customFetch) {
      if (axiosInstance) {
        this.axiosInstance = axiosInstance;
      } else {
        this.axiosInstance = axios.create({
          baseURL: this.baseUrl,
          withCredentials: true,
          ...axiosConfig,
        });

        // Apply auth interceptors if provided
        if (authInterceptors) {
          this.applyAuthInterceptors(authInterceptors);
        }
      }
    }
  }

  /**
   * Get the base URL used for API requests
   * @returns The base URL string
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Set a new base URL for API requests
   * @param baseUrl The new base URL to use
   */
  setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash if present

    // Update the axios instance baseURL if it was created by this class
    if (this.axiosInstance?.defaults.baseURL) {
      this.axiosInstance.defaults.baseURL = this.baseUrl;
    }
  }

  /**
   * Get the axios instance used for API requests
   * @returns The axios instance
   */
  getAxiosInstance(): AxiosInstance | undefined {
    return this.axiosInstance;
  }

  /**
   * Set a new axios instance for API requests
   * @param axiosInstance The new axios instance to use
   */
  setAxiosInstance(axiosInstance: AxiosInstance): void {
    this.axiosInstance = axiosInstance;
  }

  /**
   * Internal helper to execute a request using custom fetch
   */
  private async executeFetch(
    url: string,
    method: string,
    payload: any,
    axiosConfig: AxiosRequestConfig,
  ): Promise<any> {
    if (!this.customFetch) return null;

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: payload ? JSON.stringify(payload) : undefined,
    };

    const response = await this.customFetch(url, fetchOptions);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || response.statusText);
    }

    return data;
  }

  /**
   * Apply auth interceptors to the axios instance

  /**
   * Apply auth interceptors to the axios instance
   * @param authInterceptors The auth interceptors to apply
   */
  applyAuthInterceptors(authInterceptors: AuthInterceptors): void {
    // Add request interceptor
    this.axiosInstance?.interceptors.request.use(authInterceptors.request);

    // Add response interceptors
    this.axiosInstance?.interceptors.response.use(
      authInterceptors.response.onFulfilled,
      authInterceptors.response.onRejected,
    );
  }

  /**
   * Fetches records from a specified table with filtering and pagination
   * @param tableName The name of the table to query
   * @param params Query parameters including filters and pagination
   * @param options Query options
   * @param axiosConfig Custom axios config for this specific request
   * @returns Promise containing the fetched records
   */
  async getRecords<T extends Record<string, any>>(
    tableName: string,
    params: QueryParams<T> = {},
    options: QueryOptions = { execute: true },
    axiosConfig: AxiosRequestConfig = {},
  ): Promise<ApiResponse<T>> {
    // If execute is false, return only the parameters
    if (!options.execute) {
      return { params: params };
    }

    const payload = { query: params };

    try {
      if (this.customFetch) {
        const data = await this.executeFetch(
          `${this.baseUrl}/query/${tableName}`,
          'POST',
          payload,
          axiosConfig,
        );

        return {
          records: data as T[],
          params: params,
          message: 'Records fetched successfully',
          error: undefined,
        };
      }

      const response = await this.axiosInstance?.post<ApiResponse<T>>(
        `/query/${tableName}`,
        payload,
        axiosConfig,
      );

      return {
        records: response?.data as T[],
        params: params,
        message: 'Records fetched successfully',
        error: undefined,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || error.message);
      }
      throw error;
    }
  }

  /**
   * Creates a new record in the specified table
   * @param tableName The name of the table to create the record in
   * @param data The data to create the record with
   * @param axiosConfig Custom axios config for this specific request
   * @returns Promise containing the created record
   */
  async createRecord<
    T extends Record<string, any>,
    C extends Record<string, any> = any,
  >(
    tableName: string,
    data: C,
    axiosConfig: AxiosRequestConfig = {},
  ): Promise<ApiResponse<T>> {
    this.validateData(data);

    const payload = { data };

    try {
      if (this.customFetch) {
        const responseData = await this.executeFetch(
          `${this.baseUrl}/create/${tableName}`,
          'POST',
          payload,
          axiosConfig,
        );

        return {
          records: [responseData as T],
          message: 'Record created successfully',
          error: undefined,
        };
      }

      const response = await this.axiosInstance?.post<ApiResponse<T>>(
        `/create/${tableName}`,
        payload,
        axiosConfig,
      );
      return {
        records: [response?.data as T],
        message: 'Record created successfully',
        error: undefined,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || error.message);
      }
      throw error;
    }
  }

  /**
   * Updates a record by ID in the specified table
   * @param tableName The name of the table containing the record to update
   * @param id The ID of the record to update
   * @param data The data to update the record with
   * @param axiosConfig Custom axios config for this specific request
   * @returns Promise containing the updated record
   */
  async updateRecord<T extends Record<string, any>>(
    tableName: string,
    id: number | string,
    data: Partial<T>,
    axiosConfig: AxiosRequestConfig = {},
  ): Promise<ApiResponse<T>> {
    this.validateData(data);

    const payload = { data };

    try {
      if (this.customFetch) {
        const responseData = await this.executeFetch(
          `${this.baseUrl}/update/${tableName}/${id}`,
          'PUT',
          payload,
          axiosConfig,
        );

        return {
          records: [responseData as T],
          message: 'Record updated successfully',
          error: undefined,
        };
      }

      const response = await this.axiosInstance?.put<ApiResponse<T>>(
        `/update/${tableName}/${id}`,
        payload,
        axiosConfig,
      );
      return {
        records: [response?.data as T],
        message: 'Record updated successfully',
        error: undefined,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || error.message);
      }
      throw error;
    }
  }

  /**
   * Updates records by Complex Query from the specified table
   * @param tableName The name of the table containing the record to delete
   * @param params Query parameters including filters and pagination
   * @param options Query options
   * @param data The data to update the record with
   * @param axiosConfig Custom axios config for this specific request
   * @returns Promise containing the result of the deletion
   */
  async advanceUpdateRecord<T extends Record<string, any>>(
    tableName: string,
    data: Partial<T>,
    params: QueryParams<T> = {},
    options: QueryOptions = { execute: true },
    axiosConfig: AxiosRequestConfig = {},
  ): Promise<ApiResponse<any>> {
    const payload = { query: params, data };

    try {
      if (!options.execute) {
        return { params: params };
      }

      if (this.customFetch) {
        const responseData = await this.executeFetch(
          `${this.baseUrl}/update/${tableName}`,
          'POST',
          payload,
          axiosConfig,
        );

        return {
          message: 'Records updated successfully',
          error: undefined,
          records: responseData as T[],
        };
      }

      const response = await this.axiosInstance?.post<ApiResponse<never>>(
        `/update/${tableName}`,
        payload,
        axiosConfig,
      );
      return {
        message: 'Records updated successfully',
        error: undefined,
        records: response?.data as T[],
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || error.message);
      }
      throw error;
    }
  }

  /**
   * Deletes a record by ID from the specified table
   * @param tableName The name of the table containing the record to delete
   * @param id The ID of the record to delete
   * @param axiosConfig Custom axios config for this specific request
   * @returns Promise containing the result of the deletion
   */
  async deleteRecord<T extends Record<string, any>>(
    tableName: string,
    id: number | string,
    axiosConfig: AxiosRequestConfig = {},
  ): Promise<ApiResponse<any>> {
    const url = `${this.baseUrl}/del/${tableName}/${id}`;

    try {
      if (this.customFetch) {
        const responseData = await this.executeFetch(
          `${this.baseUrl}/del/${tableName}/${id}`,
          'POST',
          {},
          axiosConfig,
        );

        return {
          message: 'Record deleted successfully',
          error: undefined,
          records: responseData as any[],
        };
      }

      const response = await this.axiosInstance?.post<ApiResponse<never>>(
        `/del/${tableName}/${id}`,
        {},
        axiosConfig,
      );
      return {
        message: 'Record deleted successfully',
        error: undefined,
        records: response?.data as any[],
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || error.message);
      }
      throw error;
    }
  }

  /**
   * Deletes records by Complex Query from the specified table
   * @param tableName The name of the table containing the record to delete
   * @param params Query parameters including filters and pagination
   * @param options Query options
   * @param axiosConfig Custom axios config for this specific request
   * @returns Promise containing the result of the deletion
   */
  async advanceDeleteRecord<T extends Record<string, any>>(
    tableName: string,
    params: QueryParams<T> = {},
    options: QueryOptions = { execute: true },
    axiosConfig: AxiosRequestConfig = {},
  ): Promise<ApiResponse<any>> {
    const payload = { query: params };

    try {
      if (!options.execute) {
        return { params: params };
      }

      if (this.customFetch) {
        const responseData = await this.executeFetch(
          `${this.baseUrl}/del/${tableName}`,
          'POST',
          payload,
          axiosConfig,
        );

        return {
          message: 'Record deleted successfully',
          error: undefined,
          records: responseData as any[],
        };
      }

      const response = await this.axiosInstance?.post<ApiResponse<never>>(
        `/del/${tableName}`,
        payload,
        axiosConfig,
      );
      return {
        message: 'Record deleted successfully',
        error: undefined,
        records: response?.data as any[],
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || error.message);
      }
      throw error;
    }
  }

  /**
   * Helper method to create a query builder for fluent API usage
   * @param tableName The name of the table to query
   */
  table<K extends keyof Schema | keyof CreatedSchema>(
    tableName: K,
  ): QueryBuilder<
    K extends keyof Schema ? Schema[K] : any,
    undefined,
    K extends keyof CreatedSchema ? CreatedSchema[K] : any
  >;
  table<T extends Record<string, any>>(tableName: string): QueryBuilder<T>;
  table<T extends Record<string, any>>(
    tableName: string | keyof Schema,
  ): QueryBuilder<T> {
    return new QueryBuilder<T>(this, tableName as string);
  }

  /**
   * Validates data object
   */
  private validateData(data: Record<string, any>): void {
    if (typeof data !== 'object' || Object.keys(data).length === 0) {
      throw new Error('Invalid data: must be a non-empty object');
    }
  }
}

/**
 * Query builder class for more fluent API usage
 */
/**
 * Query builder class for more fluent API usage
 */
class QueryBuilder<
  T extends Record<string, any>,
  Result extends Record<string, any> | undefined = undefined,
  C extends Record<string, any> = any,
> {
  private params: QueryParams<T> = {};
  private currentGroup?: WhereGroup<T>;
  private ctes: Map<string, CTE<T>> = new Map();

  constructor(
    private sdk: DatabaseSDK,
    private tableName: string,
  ) {}

  /**
   * Add a recursive CTE
   */
  withRecursive(
    name: string,
    initialQuery: QueryBuilder<T, any>,
    recursiveQuery: QueryBuilder<T, any>,
    options: { unionAll?: boolean; columns?: string[] } = {},
  ): this {
    if (!this.params.recursiveCtes) {
      this.params.recursiveCtes = [];
    }

    this.params.recursiveCtes.push({
      name,
      isRecursive: true,
      initialQuery,
      recursiveQuery,
      unionAll: options.unionAll,
      columns: options.columns,
      query: initialQuery, // for compatibility with non-recursive CTEs
    });

    return this;
  }

  /**
   * Advanced window function
   */
  windowAdvanced<Alias extends string>(
    type: WindowFunction<T>['type'],
    alias: Alias,
    config: Partial<WindowFunctionAdvanced<T>>,
  ): QueryBuilder<
    T,
    Result extends undefined
      ? T & { [P in Alias]: number }
      : Result & { [P in Alias]: number }
  > {
    if (!this.params.advancedWindows) {
      this.params.advancedWindows = [];
    }

    this.params.advancedWindows.push({
      type,
      alias,
      ...config,
    });

    return this as any;
  }

  /**
   * Add a window function
   */
  window<Alias extends string>(
    type: WindowFunction<T>['type'],
    alias: Alias,
    config: Partial<Omit<WindowFunction<T>, 'type' | 'alias'>> = {},
  ): QueryBuilder<
    T,
    Result extends undefined
      ? T & { [P in Alias]: number }
      : Result & { [P in Alias]: number }
  > {
    if (!this.params.windowFunctions) {
      this.params.windowFunctions = [];
    }

    this.params.windowFunctions.push({
      type,
      alias,
      field: config.field,
      partitionBy: config.partitionBy,
      orderBy: config.orderBy,
      frameClause: config.frameClause,
    });

    return this as any;
  }

  /**
   * Add common window functions
   */
  rowNumber<Alias extends string>(
    alias: Alias,
    partitionBy?: FieldKeys<T>[],
    orderBy?: OrderByClause<T>[],
  ): QueryBuilder<
    T,
    Result extends undefined
      ? T & { [P in Alias]: number }
      : Result & { [P in Alias]: number }
  > {
    return this.window('row_number', alias, { partitionBy, orderBy });
  }

  rank<Alias extends string>(
    alias: Alias,
    partitionBy?: FieldKeys<T>[],
    orderBy?: OrderByClause<T>[],
  ): QueryBuilder<
    T,
    Result extends undefined
      ? T & { [P in Alias]: number }
      : Result & { [P in Alias]: number }
  > {
    return this.window('rank', alias, { partitionBy, orderBy });
  }

  lag<Alias extends string>(
    field: FieldKeys<T>,
    alias: Alias,
    partitionBy?: FieldKeys<T>[],
    orderBy?: OrderByClause<T>[],
  ): QueryBuilder<
    T,
    Result extends undefined
      ? T & { [P in Alias]: number }
      : Result & { [P in Alias]: number }
  > {
    return this.window('lag', alias, { field, partitionBy, orderBy });
  }

  lead<Alias extends string>(
    field: FieldKeys<T>,
    alias: Alias,
    partitionBy?: FieldKeys<T>[],
    orderBy?: OrderByClause<T>[],
  ): QueryBuilder<
    T,
    Result extends undefined
      ? T & { [P in Alias]: number }
      : Result & { [P in Alias]: number }
  > {
    return this.window('lead', alias, { field, partitionBy, orderBy });
  }

  /**
   * Add a CTE (WITH clause)
   */
  with(
    name: string,
    queryOrCallback:
      | QueryBuilder<T, any>
      | ((query: QueryBuilder<T, T>) => void),
    columns?: FieldKeys<T>[],
  ): this {
    let query: QueryBuilder<T, any>;

    if (typeof queryOrCallback === 'function') {
      query = new QueryBuilder(this.sdk, this.tableName);
      queryOrCallback(query);
    } else {
      query = queryOrCallback;
    }

    this.ctes.set(name, {
      name,
      query,
      columns: columns || [],
    });

    if (!this.params.ctes) {
      this.params.ctes = [];
    }
    this.params.ctes.push({ name, query, columns: columns || [] });

    return this;
  }

  /**
   * Transform the result set
   */
  transform(config: TransformConfig<T>): this {
    this.params.transforms = {
      ...this.params.transforms,
      ...config,
    };
    return this;
  }

  /**
   * Pivot the result set
   */
  pivot(
    column: string,
    values: string[],
    aggregate: AggregateOptions<T>,
  ): this {
    return this.transform({
      pivot: {
        column,
        values,
        aggregate,
      },
    });
  }

  /**
   * Compute new fields from existing ones
   */
  compute(computations: Record<string, (row: T) => any>): this {
    return this.transform({
      compute: computations,
    });
  }

  // Basic where clause
  /**
   * Add a where clause
   * @param field The field to filter on
   * @param operator The comparison operator
   * @param value The value to compare against
   * @returns The query builder instance
   */
  where(field: FieldKeys<T>, operator: WhereOperator, value: any): this;
  where(field: FieldKeys<T>, value: any): this;
  where(conditions: Partial<T>): this;
  where(
    fieldOrConditions: FieldKeys<T> | Partial<T>,
    operatorOrValue?: WhereOperator | any,
    value?: any,
  ): this {
    if (typeof fieldOrConditions === 'object') {
      this.params.filter = {
        ...this.params.filter,
        ...fieldOrConditions,
      } as Partial<T>;
    } else {
      if (arguments.length === 2) {
        this.params.filter = {
          ...this.params.filter,
          [fieldOrConditions]: operatorOrValue,
        } as Partial<T>;
      } else {
        if (!this.params.whereRaw) {
          this.params.whereRaw = [];
        }
        this.params.whereRaw.push({
          field: fieldOrConditions,
          operator: operatorOrValue as WhereOperator,
          value,
        });
      }
    }
    return this;
  }

  // Where between
  whereBetween(field: FieldKeys<T>, range: [any, any]): this {
    if (!this.params.whereBetween) {
      this.params.whereBetween = [];
    }
    this.params.whereBetween.push({
      field,
      operator: 'between',
      value: range,
    });
    return this;
  }

  // Where in
  whereIn(field: FieldKeys<T>, values: any[]): this {
    if (!this.params.whereIn) {
      this.params.whereIn = {};
    }
    this.params.whereIn[field] = values;
    return this;
  }

  // Where not in
  whereNotIn(field: FieldKeys<T>, values: any[]): this {
    if (!this.params.whereNotIn) {
      this.params.whereNotIn = {};
    }
    this.params.whereNotIn[field] = values;
    return this;
  }

  // Where null
  whereNull(field: FieldKeys<T>): this {
    if (!this.params.whereNull) {
      this.params.whereNull = [];
    }
    this.params.whereNull.push(field);
    return this;
  }

  // Where not null
  whereNotNull(field: FieldKeys<T>): this {
    if (!this.params.whereNotNull) {
      this.params.whereNotNull = [];
    }
    this.params.whereNotNull.push(field);
    return this;
  }

  // Order by
  orderBy(
    field: FieldKeys<T>,
    direction?: 'asc' | 'desc',
    nulls?: 'first' | 'last',
  ): this;
  orderBy(options: OrderByClause<T>): this;
  orderBy(
    fieldOrOptions: FieldKeys<T> | OrderByClause<T>,
    direction?: 'asc' | 'desc',
    nulls?: 'first' | 'last',
  ): this {
    if (!this.params.orderBy) {
      this.params.orderBy = [];
    }

    if (typeof fieldOrOptions === 'string') {
      direction = direction || 'asc';
      this.params.orderBy.push({
        field: fieldOrOptions as FieldKeys<T>,
        direction,
        nulls,
      });
    } else {
      this.params.orderBy.push(fieldOrOptions as OrderByClause<T>);
    }

    return this;
  }

  limit(limit: number): this {
    this.params.limit = limit;
    return this;
  }

  offset(offset: number): this {
    this.params.offset = offset;
    return this;
  }

  /**
   * Start an OR where group
   */
  orWhere(callback: (query: QueryBuilder<T, Result>) => void): this {
    return this.whereGroup('OR', callback);
  }

  /**
   * Start an AND where group
   */
  andWhere(callback: (query: QueryBuilder<T, Result>) => void): this {
    return this.whereGroup('AND', callback);
  }

  /**
   * Create a where group with the specified operator
   */
  private whereGroup(
    operator: GroupOperator,
    callback: (query: QueryBuilder<T, Result>) => void,
  ): this {
    // Create a new builder for the group to collect clauses
    const groupBuilder = new QueryBuilder<T, Result>(this.sdk, this.tableName);

    // Execute the callback with the group builder to collect clauses
    callback(groupBuilder);

    // Create the where group with the collected clauses
    const group: WhereGroup<T> = {
      type: operator,
      clauses: [],
    };

    // Add all whereRaw clauses to the group
    if (
      groupBuilder.params.whereRaw &&
      groupBuilder.params.whereRaw.length > 0
    ) {
      group.clauses.push(...groupBuilder.params.whereRaw);
    }

    // Add all where groups from the builder to our group
    if (
      groupBuilder.params.whereGroups &&
      groupBuilder.params.whereGroups.length > 0
    ) {
      group.clauses.push(...groupBuilder.params.whereGroups);
    }

    // Initialize the whereGroups array if it doesn't exist
    if (!this.params.whereGroups) {
      this.params.whereGroups = [];
    }

    // Add the group to whereGroups array
    this.params.whereGroups.push(group);

    return this;
  }

  /**
   * Add a where exists clause using a subquery
   */
  whereExists(
    subqueryBuilder: (qb: DatabaseSDK) => QueryBuilder<any, any>,
  ): this {
    if (!this.params.whereExists) {
      this.params.whereExists = [];
    }

    // Create a new SDK instance for the subquery
    const subquerySdk = new DatabaseSDK({ baseUrl: this.sdk.getBaseUrl() });

    // Get the subquery builder
    const subquery = subqueryBuilder(subquerySdk);

    // Extract the table name and parameters
    this.params.whereExists.push({
      tableName: subquery.getTableName(),
      params: subquery.getParams(),
    });

    return this;
  }

  /**
   * Add a where exists clause with join conditions
   */
  whereExistsJoin(
    tableName: string,
    leftField: FieldKeys<T>,
    rightField: string,
    additionalConditions?: (qb: QueryBuilder<any, any>) => void,
  ): this {
    if (!this.params.whereExists) {
      this.params.whereExists = [];
    }

    // Create a new SDK instance for the subquery
    const subquerySdk = new DatabaseSDK({ baseUrl: this.sdk.getBaseUrl() });

    // Build the subquery
    const subQueryBuilder = subquerySdk.table(tableName);

    // Apply additional conditions if provided
    if (additionalConditions) {
      additionalConditions(subQueryBuilder);
    }

    // Add the join condition
    this.params.whereExists.push({
      tableName,
      params: subQueryBuilder.getParams(),
      joinCondition: {
        leftField: leftField as string,
        operator: '=',
        rightField,
      },
    });

    return this;
  }

  // Helper methods for the whereExists functions
  getTableName(): string {
    return this.tableName;
  }

  getParams(): QueryParams<T> {
    return this.params;
  }

  /**
   * Group by clause
   */
  groupBy<K extends keyof T>(...fields: K[]): this {
    if (!this.params.groupBy) {
      this.params.groupBy = [];
    }
    this.params.groupBy.push(...(fields as string[]));
    return this;
  }

  /**
   * Having clause for grouped queries
   */
  having(
    field: FieldKeys<T> | string,
    operator: WhereOperator,
    value: any,
  ): this {
    if (!this.params.having) {
      this.params.having = [];
    }
    this.params.having.push({ field, operator, value });
    return this;
  }

  /**
   * Add an aggregate function
   */
  aggregate<Alias extends string>(
    type: AggregateOptions<T>['type'],
    field: FieldKeys<T>,
    alias?: Alias,
  ): QueryBuilder<
    T,
    Result extends undefined
      ? T & { [P in Alias]: number }
      : Result & { [P in Alias]: number }
  > {
    if (!this.params.aggregates) {
      this.params.aggregates = [];
    }
    this.params.aggregates.push({ type, field, alias });
    return this as any;
  }

  /**
   * Shorthand for count aggregate
   */
  count<Alias extends string = 'count'>(
    field: FieldKeys<T> = '*',
    alias: Alias = 'count' as Alias,
  ): QueryBuilder<
    T,
    Result extends undefined
      ? T & { [P in Alias]: number }
      : Result & { [P in Alias]: number }
  > {
    return this.aggregate('count', field, alias);
  }

  /**
   * Shorthand for sum aggregate
   */
  sum<Alias extends string>(
    field: FieldKeys<T>,
    alias: Alias,
  ): QueryBuilder<
    T,
    Result extends undefined
      ? T & { [P in Alias]: number }
      : Result & { [P in Alias]: number }
  > {
    return this.aggregate('sum', field, alias);
  }

  /**
   * Shorthand for average aggregate
   */
  avg<Alias extends string>(
    field: FieldKeys<T>,
    alias: Alias,
  ): QueryBuilder<
    T,
    Result extends undefined
      ? T & { [P in Alias]: number }
      : Result & { [P in Alias]: number }
  > {
    return this.aggregate('avg', field, alias);
  }

  /**
   * Shorthand for minimum aggregate
   */
  min<Alias extends string>(
    field: FieldKeys<T>,
    alias: Alias,
  ): QueryBuilder<
    T,
    Result extends undefined
      ? T & { [P in Alias]: number }
      : Result & { [P in Alias]: number }
  > {
    return this.aggregate('min', field, alias);
  }

  /**
   * Shorthand for maximum aggregate
   */
  max<Alias extends string>(
    field: FieldKeys<T>,
    alias: Alias,
  ): QueryBuilder<
    T,
    Result extends undefined
      ? T & { [P in Alias]: number }
      : Result & { [P in Alias]: number }
  > {
    return this.aggregate('max', field, alias);
  }

  // Get query parameters without executing
  async toParams(): Promise<QueryParams<T>> {
    const response = await this.sdk.getRecords<T>(this.tableName, this.params, {
      execute: false,
    });
    return response.params!;
  }

  /**
   * Execute with transformations
   * @param axiosConfig Optional axios config to be used for this request
   * @returns Promise with the query results
   */
  async query(
    axiosConfig: AxiosRequestConfig = {},
  ): Promise<ApiResponse<Result extends undefined ? T : Result>> {
    const response = await this.sdk.getRecords<any>(
      this.tableName,
      this.params as any,
      { execute: true },
      axiosConfig,
    );

    if (this.params.transforms && response.records) {
      // Transformations might change type, but for now assuming Result matches
      return this.applyTransformations(response as any) as any;
    }

    this.params = {}; // Reset params after execution
    this.currentGroup = undefined;
    this.ctes.clear();

    return response;
  }

  /**
   * Create a record in the table
   * @param data The data to create
   * @param axiosConfig Optional axios config to be used for this request
   * @returns Promise with the created record
   */
  async create(
    data: C,
    axiosConfig: AxiosRequestConfig = {},
  ): Promise<ApiResponse<T>> {
    // Create returns T, not Result
    return this.sdk.createRecord<T, C>(this.tableName, data, axiosConfig);
  }

  /**
   * Update a record by ID
   * @param id The ID of the record to update
   * @param data The data to update
   * @param axiosConfig Optional axios config to be used for this request
   * @returns Promise with the updated record
   */
  async update(
    id: number | string,
    data: Partial<T>,
    axiosConfig: AxiosRequestConfig = {},
  ): Promise<ApiResponse<T>> {
    return this.sdk.updateRecord<T>(this.tableName, id, data, axiosConfig);
  }

  /**
   * Update records by Complex query
   * @param data The data to update
   * @param axiosConfig Optional axios config to be used for this request
   * @returns Promise with the deletion result
   */
  async advanceUpdate(
    data: Partial<T>,
    axiosConfig: AxiosRequestConfig = {},
  ): Promise<ApiResponse<any>> {
    const reps = await this.sdk.advanceUpdateRecord(
      this.tableName,
      data,
      this.params,
      { execute: true },
      axiosConfig,
    );

    if (this.params.transforms && reps.records) {
      // Transformations might change type, but for now assuming Result matches
      return this.applyTransformations(reps as any) as any;
    }

    this.params = {}; // Reset params after execution
    this.currentGroup = undefined;
    this.ctes.clear();

    return reps;
  }

  /**
   * Delete a record by ID
   * @param id The ID of the record to delete
   * @param axiosConfig Optional axios config to be used for this request
   * @returns Promise with the deletion result
   */
  async delete(
    id: number | string,
    axiosConfig: AxiosRequestConfig = {},
  ): Promise<ApiResponse<any>> {
    return this.sdk.deleteRecord(this.tableName, id, axiosConfig);
  }

  /**
   * Delete records by Complex query
   * @param axiosConfig Optional axios config to be used for this request
   * @returns Promise with the deletion result
   */
  async advanceDelete(
    axiosConfig: AxiosRequestConfig = {},
  ): Promise<ApiResponse<any>> {
    const reps = await this.sdk.advanceDeleteRecord(
      this.tableName,
      this.params,
      { execute: true },
      axiosConfig,
    );
    if (this.params.transforms && reps.records) {
      // Transformations might change type, but for now assuming Result matches
      return this.applyTransformations(reps as any) as any;
    }
    this.params = {}; // Reset params after execution
    this.currentGroup = undefined;
    this.ctes.clear();
    return reps;
  }

  private applyTransformations(response: ApiResponse<T>): ApiResponse<T> {
    let transformed = [...(response.records || [])];
    const transforms = this.params.transforms!;

    // Apply computations
    if (transforms.compute) {
      transformed = transformed.map((row) => ({
        ...row,
        ...Object.entries(transforms.compute!).reduce(
          (acc, [key, fn]) => ({
            ...acc,
            [key]: fn(row),
          }),
          {},
        ),
      }));
    }

    // Apply grouping
    if (transforms.groupBy) {
      transformed = this.groupResults(transformed, transforms.groupBy);
    }

    // Apply pivoting
    if (transforms.pivot) {
      transformed = this.pivotResults(transformed, transforms.pivot);
    }

    return {
      ...response,
      records: transformed,
    };
  }

  private groupResults(records: T[], groupBy: string[]): any[] {
    // Implementation of grouping logic
    return records;
  }

  private pivotResults(
    records: T[],
    pivot: TransformConfig<T>['pivot'],
  ): any[] {
    // Implementation of pivot logic
    return records;
  }

  /**
   * Select specific fields from the table. Pass `'*'` (or call with no args)
   * to select the entire row type `T`.
   * @param fields Fields to select or '*' for all fields
   * @example
   * db.table("users").select("id", "name").execute();
   * db.table("users").select('*').execute();
   */
  select(): QueryBuilder<T, T>;
  select(key: '*'): QueryBuilder<T, T>;
  select<K extends keyof T>(
    ...fields: K[]
  ): QueryBuilder<
    T,
    Result extends undefined ? Pick<T, K> : Result & Pick<T, K>
  >;
  select(...fields: (keyof T | '*')[]): any {
    // support select('*') or no-arg select() to request full row
    if (fields.length === 0 || (fields.length === 1 && fields[0] === '*')) {
      this.params.select = ['*'];
      return this as any;
    }

    if (!this.params.select) {
      this.params.select = [];
    }
    this.params.select.push(...(fields as string[]));
    return this as any;
  }
}
