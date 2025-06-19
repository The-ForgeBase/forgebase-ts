/* eslint-disable prefer-const */
import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import fetch from 'cross-fetch';

type FieldKeys<T> = keyof T | "*";

export type WhereOperator =
  | "="
  | "!="
  | ">"
  | ">="
  | "<"
  | "<="
  | "like"
  | "in"
  | "not in"
  | "between"
  | "is null"
  | "is not null";

export type GroupOperator = "AND" | "OR";

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
  operator: "between";
  value: [any, any];
  boolean?: GroupOperator;
}

export interface OrderByClause<T> {
  field: FieldKeys<T>;
  direction?: "asc" | "desc";
  nulls?: "first" | "last";
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
  type: "count" | "sum" | "avg" | "min" | "max";
  field: FieldKeys<T>;
  alias?: string;
}

export interface WindowFunction<T> {
  type:
    | "row_number"
    | "rank"
    | "dense_rank"
    | "lag"
    | "lead"
    | "first_value"
    | "last_value"
    | "sum"
    | "avg"
    | "count"
    | "min"
    | "max"
    | "nth_value"
    | "ntile";
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
  format?: "text" | "json";
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
      type: "ROWS" | "RANGE";
      start: "UNBOUNDED PRECEDING" | "CURRENT ROW" | number;
      end?: "UNBOUNDED FOLLOWING" | "CURRENT ROW" | number;
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
  select?: FieldKeys<T>[];
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

export class DatabaseSDK {
  private baseUrl: string;
  public axiosInstance?: AxiosInstance;
  public headers: Record<string, string> = {};
  public httpClient: "axios" | "fetch" = "fetch";
  public fetchOptions?: {
    responseInterceptor?: (response: Response) => Promise<Response>;
    requestInterceptor?: (request: Request) => Promise<Request>;
  };

  /**
   * Create a new DatabaseSDK instance
   * @param baseUrl The base URL for API requests
   * @param axiosInstance Optional custom axios instance (e.g., from ForgebaseAuth)
   * @param axiosConfig Optional axios configuration
   * @param authInterceptors Optional auth interceptors to apply to the axios instance
   * @param customFetch Optional custom fetch implementation to use instead of axios
   * @param headers Optional headers to include in every request (used with fetch)
   */
  constructor(options: {
    baseUrl: string;
    useAxios?: boolean;
    axiosOptions?: {
      axiosInstance?: AxiosInstance;
    axiosConfig?: AxiosRequestConfig;
    authInterceptors?: AuthInterceptors;
    }
    useFetch?: boolean;
    fetchOptions?: {
      responseInterceptor?: (response: Response) => Promise<Response>;
      requestInterceptor?: (request: Request) => Promise<Request>;
    }
    headers?: Record<string, string>;
  }) {
    let { baseUrl, axiosOptions, useAxios, useFetch, headers, fetchOptions } = options;
    this.baseUrl = baseUrl.replace(/\/$/, ""); // Remove trailing slash if present

    if (useAxios) {
      this.httpClient = "axios";
      if (axiosOptions?.axiosInstance) {
        this.axiosInstance = axiosOptions.axiosInstance;
      } else {
        this.axiosInstance = axios.create({
          baseURL: this.baseUrl,
          withCredentials: true,
          ...axiosOptions?.axiosConfig,
        });
        if (axiosOptions?.authInterceptors) {
          this.applyAuthInterceptors(axiosOptions.authInterceptors);
        }
      }
    } else {
      this.headers = {
        'Content-Type': 'application/json',
        ...headers,
      };
      this.httpClient = "fetch";

      if (fetchOptions?.requestInterceptor) {
        this.fetchOptions = {
          requestInterceptor: fetchOptions.requestInterceptor,
        };
      }
      if (fetchOptions?.responseInterceptor) {
        this.fetchOptions = {
          responseInterceptor: fetchOptions.responseInterceptor,
        };
      }
    }
  }

  private async _request<D>(config: {
    method: 'get' | 'post' | 'put' | 'delete',
    url: string,
    data?: any,
    httpClientConfig?: AxiosRequestConfig | RequestInit
  }): Promise<D> {
    const httpClient = this.httpClient;
    if (httpClient === "fetch") {
      const httpClientConfig = config.httpClientConfig as RequestInit;
      const options: RequestInit = {
        method: config.method.toUpperCase(),
        headers: {
          'Content-Type': 'application/json',
          ...this.headers,
          ...httpClientConfig.headers,
        },
        ...httpClientConfig,
      };
      
      let request = new Request(this.baseUrl + config.url, options);  
      if (this.fetchOptions?.requestInterceptor) {
        request = await this.fetchOptions.requestInterceptor(request);
      }
      if (config.data) {
        options.body = JSON.stringify(config.data);
      }

      let response = await fetch(request);

      if (this.fetchOptions?.responseInterceptor) {
        response = await this.fetchOptions.responseInterceptor(response);
      }
      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.error || 'Request failed');
      }
      return responseData;
    } else if (httpClient === "axios" && this.axiosInstance) {
      const httpClientConfig = config.httpClientConfig as AxiosRequestConfig;
      const response = await this.axiosInstance.request<D>({
        url: config.url,
        method: config.method,
        data: config.data,
        ...httpClientConfig
      });
      return response.data;
    } else {
      throw new Error('HTTP client not configured');
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
    this.baseUrl = baseUrl.replace(/\/$/, ""); // Remove trailing slash if present

    // Update the axios instance baseURL if it was created by this class
    if (this.axiosInstance && this.axiosInstance.defaults.baseURL) {
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
   * @param axiosConfig Custom axios config for this specific request (only used if SDK is initialized with axios)
   * @returns Promise containing the fetched records
   */
  async getRecords<T extends Record<string, any>>(
    tableName: string,
    params: QueryParams<T> = {},
    options: QueryOptions = { execute: true },
    httpClientConfig: AxiosRequestConfig | RequestInit = {},
  ): Promise<ApiResponse<T>> {
    // If execute is false, return only the parameters
    if (!options.execute) {
      return { params: params };
    }

    try {
      const responseData = await this._request<T[]>({
        method: 'post',
        url: `/query/${tableName}`,
        data: { query: params },
        httpClientConfig: httpClientConfig,
      });
      return {
        records: responseData,
        params: params,
        message: "Records fetched successfully",
        error: undefined,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
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
  async createRecord<T extends Record<string, any>>(
    tableName: string,
    data: T,
    httpClientConfig: AxiosRequestConfig | RequestInit = {},
  ): Promise<ApiResponse<T>> {
    this.validateData(data);

    try {
      const responseData = await this._request<T>({
        method: 'post',
        url: `/create/${tableName}`,
        data: { data },
        httpClientConfig,
      });
      return {
        records: [responseData],
        message: "Record created successfully",
        error: undefined,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
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
    httpClientConfig: AxiosRequestConfig | RequestInit = {},
  ): Promise<ApiResponse<T>> {
    this.validateData(data);

    try {
      const responseData = await this._request<T>({
        method: 'put',
        url: `/update/${tableName}/${id}`,
        data: { data },
        httpClientConfig,
      });
      return {
        records: [responseData],
        message: "Record updated successfully",
        error: undefined,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
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
    httpClientConfig: AxiosRequestConfig | RequestInit = {},
  ): Promise<ApiResponse<any>> {
    try {
      if (!options.execute) {
        return { params: params };
      }

      const responseData = await this._request<T[]>({
        method: 'post',
        url: `/update/${tableName}`,
        data: { query: params, data },
        httpClientConfig,
      });

      return {
        message: "Records updated successfully",
        error: undefined,
        records: responseData,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
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
    httpClientConfig: AxiosRequestConfig | RequestInit = {},
  ): Promise<ApiResponse<any>> {
    try {
      const responseData = await this._request<any[]>({
        method: 'post',
        url: `/del/${tableName}/${id}`,
        httpClientConfig,
      });
      return {
        message: "Record deleted successfully",
        error: undefined,
        records: responseData,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
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
      httpClientConfig: AxiosRequestConfig | RequestInit = {},
  ): Promise<ApiResponse<any>> {
    try {
      if (!options.execute) {
        return { params: params };
      }

      const responseData = await this._request<any[]>({
        method: 'post',
        url: `/del/${tableName}`,
        data: { query: params },
        httpClientConfig,
      });
      return {
        message: "Record deleted successfully",
        error: undefined,
        records: responseData,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw error;
    }
  }

  /**
   * Helper method to create a query builder for fluent API usage
   * @param tableName The name of the table to query
   */
  table<T extends Record<string, any>>(tableName: string) {
    return new QueryBuilder<T>(this, tableName);
  }

  /**
   * Validates data object
   */
  private validateData(data: Record<string, any>): void {
    if (typeof data !== "object" || Object.keys(data).length === 0) {
      throw new Error("Invalid data: must be a non-empty object");
    }
  }
}

/**
 * Query builder class for more fluent API usage
 */
class QueryBuilder<T extends Record<string, any>> {
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
    initialQuery: QueryBuilder<T>,
    recursiveQuery: QueryBuilder<T>,
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
  windowAdvanced(
    type: WindowFunction<T>["type"],
    alias: string,
    config: Partial<WindowFunctionAdvanced<T>>,
  ): this {
    if (!this.params.advancedWindows) {
      this.params.advancedWindows = [];
    }

    this.params.advancedWindows.push({
      type,
      alias,
      ...config,
    });

    return this;
  }

  /**
   * Add a window function
   */
  window(
    type: WindowFunction<T>["type"],
    alias: string,
    config: Partial<Omit<WindowFunction<T>, "type" | "alias">> = {},
  ): this {
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

    return this;
  }

  /**
   * Add common window functions
   */
  rowNumber(
    alias: string,
    partitionBy?: string[],
    orderBy?: OrderByClause<T>[],
  ): this {
    return this.window("row_number", alias, { partitionBy, orderBy });
  }

  rank(
    alias: string,
    partitionBy?: string[],
    orderBy?: OrderByClause<T>[],
  ): this {
    return this.window("rank", alias, { partitionBy, orderBy });
  }

  lag(
    field: string,
    alias: string,
    partitionBy?: string[],
    orderBy?: OrderByClause<T>[],
  ): this {
    return this.window("lag", alias, { field, partitionBy, orderBy });
  }

  lead(
    field: string,
    alias: string,
    partitionBy?: string[],
    orderBy?: OrderByClause<T>[],
  ): this {
    return this.window("lead", alias, { field, partitionBy, orderBy });
  }

  /**
   * Add a CTE (WITH clause)
   */
  with(
    name: string,
    queryOrCallback: QueryBuilder<T> | ((query: QueryBuilder<T>) => void),
    columns?: FieldKeys<T>[],
  ): this {
    let query: QueryBuilder<T>;

    if (typeof queryOrCallback === "function") {
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
   * @example
   * db.table<User>("users").where("status", "active").execute();
   * db.table<User>("users").where("age", ">", 18).execute();
   * db.table<User>("users").where("role", "in", ["admin", "manager"]).execute();
   * db.table<User>("users").where("created_at", "is not null").execute();
   * db.table<User>("users").where("name", "like", "%doe%").execute();
   * db.table<User>("users").where("id", 1).execute();
   * db.table<User>("users").where({ status: "active", role: "admin" }).execute();
   * db.table<User>("users").where("age", ">=", 18).where("role", "manager").execute();
   * db.table<User>("users").where("age", ">=", 18).orWhere((query) => {
   *  query.where("role", "manager").where("department", "IT");
   * }).execute();
   */
  where(field: FieldKeys<T>, operator: WhereOperator, value: any): this;
  where(field: FieldKeys<T>, value: any): this;
  where(conditions: Record<FieldKeys<T>, any>): this;
  where(
    fieldOrConditions: FieldKeys<T> | Record<FieldKeys<T>, any>,
    operatorOrValue?: WhereOperator | any,
    value?: any,
  ): this {
    if (typeof fieldOrConditions === "object") {
      this.params.filter = {
        ...this.params.filter,
        ...fieldOrConditions,
      } as Partial<T>;
    } else {
      // biome-ignore lint/style/noArguments: <explanation>
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
      operator: "between",
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
    direction?: "asc" | "desc",
    nulls?: "first" | "last",
  ): this;
  orderBy(options: OrderByClause<T>): this;
  orderBy(
    fieldOrOptions: FieldKeys<T> | OrderByClause<T>,
    direction?: "asc" | "desc",
    nulls?: "first" | "last",
  ): this {
    if (!this.params.orderBy) {
      this.params.orderBy = [];
    }

    if (typeof fieldOrOptions === "string") {
      direction = direction || "asc";
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
  orWhere(callback: (query: QueryBuilder<T>) => void): this {
    return this.whereGroup("OR", callback);
  }

  /**
   * Start an AND where group
   */
  andWhere(callback: (query: QueryBuilder<T>) => void): this {
    return this.whereGroup("AND", callback);
  }

  /**
   * Create a where group with the specified operator
   */
  private whereGroup(
    operator: GroupOperator,
    callback: (query: QueryBuilder<T>) => void,
  ): this {
    // Create a new builder for the group to collect clauses
    const groupBuilder = new QueryBuilder<T>(this.sdk, this.tableName);

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
   * @param subqueryBuilder A function that returns a configured query builder for the subquery
   * @returns The query builder instance
   * @example
   * db.table<User>("users")
   *   .whereExists((subquery) =>
   *     subquery.table("orders")
   *       .where("orders.user_id", "=", "users.id")
   *       .where("total", ">", 1000)
   *   )
   *   .execute();
   */
  whereExists(subqueryBuilder: (qb: DatabaseSDK) => QueryBuilder<T>): this {
    if (!this.params.whereExists) {
      this.params.whereExists = [];
    }

    // Create a new SDK instance for the subquery
    const subquerySdk = new DatabaseSDK({
      baseUrl: this.sdk.getBaseUrl(),
      axiosOptions: {
        axiosInstance: this.sdk.axiosInstance,
      },
      useAxios: this.sdk.httpClient === "axios",
      headers: this.sdk.headers,
      fetchOptions: this.sdk.fetchOptions,
      useFetch: this.sdk.httpClient === "fetch",
    });

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
   * @param tableName The table to check for existence
   * @param leftField The field from the main table
   * @param rightField The field from the subquery table
   * @param additionalConditions Additional conditions for the subquery
   * @returns The query builder instance
   * @example
   * db.table<User>("users")
   *   .whereExistsJoin("orders", "id", "user_id", (qb) =>
   *     qb.where("total", ">", 1000)
   *   )
   *   .execute();
   */
  whereExistsJoin(
    tableName: string,
    leftField: FieldKeys<T>,
    rightField:  FieldKeys<T>,
    additionalConditions?: (qb: QueryBuilder<any>) => void,
  ): this {
    if (!this.params.whereExists) {
      this.params.whereExists = [];
    }

    // Create a new SDK instance for the subquery
    const subquerySdk = new DatabaseSDK({
      baseUrl: this.sdk.getBaseUrl(),
      axiosOptions: {
        axiosInstance: this.sdk.axiosInstance,
      },
      useAxios: this.sdk.httpClient === "axios",
      headers: this.sdk.headers,
      fetchOptions: this.sdk.fetchOptions,
      useFetch: this.sdk.httpClient === "fetch",
    });

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
        operator: "=",
        rightField: rightField as string,
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

  // rawExpression method removed for security reasons

  /**
   * Group by clause
   */
  groupBy(...fields:  FieldKeys<T>[]): this {
    if (!this.params.groupBy) {
      this.params.groupBy = [];
    }
    this.params.groupBy.push(...fields);
    return this;
  }

  /**
   * Having clause for grouped queries
   */
  having(field:  FieldKeys<T>, operator: WhereOperator, value: any): this {
    if (!this.params.having) {
      this.params.having = [];
    }
    this.params.having.push({ field, operator, value });
    return this;
  }

  /**
   * Add an aggregate function
   */
  aggregate(
    type: AggregateOptions<T>["type"],
    field: FieldKeys<T>,
    alias?: string,
  ): this {
    if (!this.params.aggregates) {
      this.params.aggregates = [];
    }
    this.params.aggregates.push({ type, field, alias });
    return this;
  }

  /**
   * Shorthand for count aggregate
   */
  count(field: FieldKeys<T> = "*", alias?: string): this {
    return this.aggregate("count", field, alias);
  }

  /**
   * Shorthand for sum aggregate
   */
  sum(field: FieldKeys<T>, alias?: string): this {
    return this.aggregate("sum", field, alias);
  }

  /**
   * Shorthand for average aggregate
   */
  avg(field: FieldKeys<T>, alias?: string): this {
    return this.aggregate("avg", field, alias);
  }

  /**
   * Shorthand for minimum aggregate
   */
  min(field: FieldKeys<T>, alias?: string): this {
    return this.aggregate("min", field, alias);
  }

  /**
   * Shorthand for maximum aggregate
   */
  max(field: FieldKeys<T>, alias?: string): this {
    return this.aggregate("max", field, alias);
  }

  // Get query parameters without executing
  async toParams(): Promise<QueryParams<T>> {
    const response = await this.sdk.getRecords<T>(this.tableName, this.params, {
      execute: false,
    });
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    return response.params!;
  }

  /**
   * Execute with transformations
   * @param axiosConfig Optional axios config to be used for this request
   * @returns Promise with the query results
   */
    async query(httpClientConfig: AxiosRequestConfig | RequestInit = {}): Promise<ApiResponse<T>> {
    const response = await this.sdk.getRecords<T>(
      this.tableName,
      this.params,
      { execute: true },
      httpClientConfig,
    );

    if (this.params.transforms && response.records) {
      return this.applyTransformations(response);
    }

    return response;
  }

  /**
   * Create a record in the table
   * @param data The data to create
   * @param axiosConfig Optional axios config to be used for this request
   * @returns Promise with the created record
   */
  async create(
    data: T,
    httpClientConfig: AxiosRequestConfig | RequestInit = {},
  ): Promise<ApiResponse<T>> {
    return this.sdk.createRecord<T>(this.tableName, data, httpClientConfig);
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
    httpClientConfig: AxiosRequestConfig | RequestInit = {},
  ): Promise<ApiResponse<T>> {
    return this.sdk.updateRecord<T>(this.tableName, id, data, httpClientConfig);
  }

  /**
   * Update records by Complex query
   * @param data The data to update
   * @param axiosConfig Optional axios config to be used for this request
   * @returns Promise with the deletion result
   */
  async advanceUpdate(
    data: Partial<T>,
    httpClientConfig: AxiosRequestConfig | RequestInit = {},
  ): Promise<ApiResponse<any>> {
    return this.sdk.advanceUpdateRecord(
      this.tableName,
      data,
      this.params,
      { execute: true },
      httpClientConfig,
    );
  }

  /**
   * Delete a record by ID
   * @param id The ID of the record to delete
   * @param axiosConfig Optional axios config to be used for this request
   * @returns Promise with the deletion result
   */
  async delete(
    id: number | string,
    httpClientConfig: AxiosRequestConfig | RequestInit = {},
  ): Promise<ApiResponse<any>> {
    return this.sdk.deleteRecord(this.tableName, id, httpClientConfig);
  }

  /**
   * Delete records by Complex query
   * @param axiosConfig Optional axios config to be used for this request
   * @returns Promise with the deletion result
   */
  async advanceDelete(
    httpClientConfig: AxiosRequestConfig | RequestInit = {},
  ): Promise<ApiResponse<any>> {
    return this.sdk.advanceDeleteRecord(
      this.tableName,
      this.params,
      { execute: true },
      httpClientConfig,
    );
  }

  private applyTransformations(response: ApiResponse<T>): ApiResponse<T> {
    let transformed = [...(response.records || [])];
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    const transforms = this.params.transforms!;

    // Apply computations
    if (transforms.compute) {
      transformed = transformed.map((row) => ({
        ...row,
        // biome-ignore lint/style/noNonNullAssertion: <explanation>
        ...Object.entries(transforms.compute!).reduce(
          (acc, [key, fn]) => ({
            // biome-ignore lint/performance/noAccumulatingSpread: <explanation>
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
    pivot: TransformConfig<T>["pivot"],
  ): any[] {
    // Implementation of pivot logic
    return records;
  }

  /**
   * Select specific fields from the table
   * @param fields Fields to select
   * @example
   * db.table("users")
   *   .select("id", "name", "email")
   *   .execute();
   */
  select(...fields: FieldKeys<T>[]): this {
    if (!this.params.select) {
      this.params.select = [];
    }
    this.params.select.push(...fields);
    return this;
  }
}

// interface User {
//   id: number;
//   name: string;
//   email: string;
// }

// const db = new DatabaseSDK({
//   baseUrl: "https://api.example.com",
// });

// db.table<User>("users")
//   .select("id", "name", "email")
//   .where("id", "=", 1)
//   .query();