/* eslint-disable */
/* tslint:disable */
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export interface Permission {
  /** @default "" */
  action: string;
  /** @default "" */
  subject: string;
  condition: object;
}

/** @default "" */
export type PermissionAction = string;

/** @default "" */
export type PermissionSubject = string;

export interface Role {
  /** @default "" */
  name: string;
  /** @default "" */
  level: string;
  permissions: string[];
}

/** @default "" */
export type RoleLevel = string;

export type QueryParamsType = Record<string | number, any>;
export type ResponseFormat = keyof Omit<Body, 'body' | 'bodyUsed'>;

export interface FullRequestParams extends Omit<RequestInit, 'body'> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean;
  /** request path */
  path: string;
  /** content type of request body */
  type?: ContentType;
  /** query params */
  query?: QueryParamsType;
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseFormat;
  /** request body */
  body?: unknown;
  /** base url */
  baseUrl?: string;
  /** request cancellation token */
  cancelToken?: CancelToken;
}

export type RequestParams = Omit<FullRequestParams, 'body' | 'method' | 'query' | 'path'>;

export interface ApiConfig<SecurityDataType = unknown> {
  baseUrl?: string;
  baseApiParams?: Omit<RequestParams, 'baseUrl' | 'cancelToken' | 'signal'>;
  securityWorker?: (securityData: SecurityDataType | null) => Promise<RequestParams | void> | RequestParams | void;
  customFetch?: typeof fetch;
}

export interface HttpResponse<D extends unknown, E extends unknown = unknown> extends Response {
  data: D;
  error: E;
}

type CancelToken = Symbol | string | number;

export enum ContentType {
  Json = 'application/json',
  FormData = 'multipart/form-data',
  UrlEncoded = 'application/x-www-form-urlencoded',
  Text = 'text/plain',
}

export class HttpClient<SecurityDataType = unknown> {
  public baseUrl: string = '/endpoint/restapi/revisium/seeding/master/draft';
  private securityData: SecurityDataType | null = null;
  private securityWorker?: ApiConfig<SecurityDataType>['securityWorker'];
  private abortControllers = new Map<CancelToken, AbortController>();
  private customFetch = (...fetchParams: Parameters<typeof fetch>) => fetch(...fetchParams);

  private baseApiParams: RequestParams = {
    credentials: 'same-origin',
    headers: {},
    redirect: 'follow',
    referrerPolicy: 'no-referrer',
  };

  constructor(apiConfig: ApiConfig<SecurityDataType> = {}) {
    Object.assign(this, apiConfig);
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data;
  };

  protected encodeQueryParam(key: string, value: any) {
    const encodedKey = encodeURIComponent(key);
    return `${encodedKey}=${encodeURIComponent(typeof value === 'number' ? value : `${value}`)}`;
  }

  protected addQueryParam(query: QueryParamsType, key: string) {
    return this.encodeQueryParam(key, query[key]);
  }

  protected addArrayQueryParam(query: QueryParamsType, key: string) {
    const value = query[key];
    return value.map((v: any) => this.encodeQueryParam(key, v)).join('&');
  }

  protected toQueryString(rawQuery?: QueryParamsType): string {
    const query = rawQuery || {};
    const keys = Object.keys(query).filter((key) => 'undefined' !== typeof query[key]);
    return keys
      .map((key) => (Array.isArray(query[key]) ? this.addArrayQueryParam(query, key) : this.addQueryParam(query, key)))
      .join('&');
  }

  protected addQueryParams(rawQuery?: QueryParamsType): string {
    const queryString = this.toQueryString(rawQuery);
    return queryString ? `?${queryString}` : '';
  }

  private contentFormatters: Record<ContentType, (input: any) => any> = {
    [ContentType.Json]: (input: any) =>
      input !== null && (typeof input === 'object' || typeof input === 'string') ? JSON.stringify(input) : input,
    [ContentType.Text]: (input: any) => (input !== null && typeof input !== 'string' ? JSON.stringify(input) : input),
    [ContentType.FormData]: (input: any) =>
      Object.keys(input || {}).reduce((formData, key) => {
        const property = input[key];
        formData.append(
          key,
          property instanceof Blob
            ? property
            : typeof property === 'object' && property !== null
              ? JSON.stringify(property)
              : `${property}`,
        );
        return formData;
      }, new FormData()),
    [ContentType.UrlEncoded]: (input: any) => this.toQueryString(input),
  };

  protected mergeRequestParams(params1: RequestParams, params2?: RequestParams): RequestParams {
    return {
      ...this.baseApiParams,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...(this.baseApiParams.headers || {}),
        ...(params1.headers || {}),
        ...((params2 && params2.headers) || {}),
      },
    };
  }

  protected createAbortSignal = (cancelToken: CancelToken): AbortSignal | undefined => {
    if (this.abortControllers.has(cancelToken)) {
      const abortController = this.abortControllers.get(cancelToken);
      if (abortController) {
        return abortController.signal;
      }
      return void 0;
    }

    const abortController = new AbortController();
    this.abortControllers.set(cancelToken, abortController);
    return abortController.signal;
  };

  public abortRequest = (cancelToken: CancelToken) => {
    const abortController = this.abortControllers.get(cancelToken);

    if (abortController) {
      abortController.abort();
      this.abortControllers.delete(cancelToken);
    }
  };

  public request = async <T = any, E = any>({
    body,
    secure,
    path,
    type,
    query,
    format,
    baseUrl,
    cancelToken,
    ...params
  }: FullRequestParams): Promise<T> => {
    const secureParams =
      ((typeof secure === 'boolean' ? secure : this.baseApiParams.secure) &&
        this.securityWorker &&
        (await this.securityWorker(this.securityData))) ||
      {};
    const requestParams = this.mergeRequestParams(params, secureParams);
    const queryString = query && this.toQueryString(query);
    const payloadFormatter = this.contentFormatters[type || ContentType.Json];
    const responseFormat = format || requestParams.format;

    return this.customFetch(`${baseUrl || this.baseUrl || ''}${path}${queryString ? `?${queryString}` : ''}`, {
      ...requestParams,
      headers: {
        ...(requestParams.headers || {}),
        ...(type && type !== ContentType.FormData ? { 'Content-Type': type } : {}),
      },
      signal: (cancelToken ? this.createAbortSignal(cancelToken) : requestParams.signal) || null,
      body: typeof body === 'undefined' || body === null ? null : payloadFormatter(body),
    }).then(async (response) => {
      const r = response.clone() as HttpResponse<T, E>;
      r.data = null as unknown as T;
      r.error = null as unknown as E;

      const data = !responseFormat
        ? r
        : await response[responseFormat]()
            .then((data) => {
              if (r.ok) {
                r.data = data;
              } else {
                r.error = data;
              }
              return r;
            })
            .catch((e) => {
              r.error = e;
              return r;
            });

      if (cancelToken) {
        this.abortControllers.delete(cancelToken);
      }

      if (!response.ok) throw data;
      return data.data;
    });
  };
}

/**
 * @title Revisium organizationId: "revisium", project: "seeding", branch: "master/draft"
 * @version JQRssMKL2W1NRVItm-dLD
 * @baseUrl /endpoint/restapi/revisium/seeding/master/draft
 */
export class SeedApi<SecurityDataType extends unknown> extends HttpClient<SecurityDataType> {
  permission = {
    /**
     * No description
     *
     * @tags Permission
     * @name PermissionList
     * @request GET:/Permission
     * @secure
     */
    permissionList: (
      query: {
        /**
         * @min 1
         * @default 100
         */
        first: number;
        after?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          edges: {
            cursor: string;
            node: {
              id: string;
              versionId: string;
              createdAt: string;
              readonly: boolean;
            };
          }[];
          pageInfo: {
            startCursor: string;
            endCursor: string;
            hasNextPage: boolean;
            hasPreviousPage: boolean;
          };
          /** @min 0 */
          totalCount: number;
        },
        any
      >({
        path: `/Permission`,
        method: 'GET',
        query: query,
        secure: true,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Permission
     * @name PermissionDetail
     * @request GET:/Permission/{id}
     * @secure
     */
    permissionDetail: (id: string, params: RequestParams = {}) =>
      this.request<Permission, any>({
        path: `/Permission/${id}`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Permission
     * @name PermissionCreate
     * @request POST:/Permission/{id}
     * @secure
     */
    permissionCreate: (id: string, data: Permission, params: RequestParams = {}) =>
      this.request<Permission, any>({
        path: `/Permission/${id}`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Permission
     * @name PermissionUpdate
     * @request PUT:/Permission/{id}
     * @secure
     */
    permissionUpdate: (id: string, data: Permission, params: RequestParams = {}) =>
      this.request<Permission, any>({
        path: `/Permission/${id}`,
        method: 'PUT',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Permission
     * @name PermissionDelete
     * @request DELETE:/Permission/{id}
     * @secure
     */
    permissionDelete: (id: string, params: RequestParams = {}) =>
      this.request<boolean, any>({
        path: `/Permission/${id}`,
        method: 'DELETE',
        secure: true,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Permission
     * @name ReferencesByRoleDetail
     * @request GET:/Permission/{id}/references-by/Role
     * @secure
     */
    referencesByRoleDetail: (
      id: string,
      query: {
        /**
         * @min 1
         * @default 100
         */
        first: number;
        after?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          edges: {
            cursor: string;
            node: {
              id: string;
              versionId: string;
              createdAt: string;
              readonly: boolean;
            };
          }[];
          pageInfo: {
            startCursor: string;
            endCursor: string;
            hasNextPage: boolean;
            hasPreviousPage: boolean;
          };
          /** @min 0 */
          totalCount: number;
        },
        any
      >({
        path: `/Permission/${id}/references-by/Role`,
        method: 'GET',
        query: query,
        secure: true,
        format: 'json',
        ...params,
      }),
  };
  permissionAction = {
    /**
     * No description
     *
     * @tags PermissionAction
     * @name PermissionActionList
     * @request GET:/PermissionAction
     * @secure
     */
    permissionActionList: (
      query: {
        /**
         * @min 1
         * @default 100
         */
        first: number;
        after?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          edges: {
            cursor: string;
            node: {
              id: string;
              versionId: string;
              createdAt: string;
              readonly: boolean;
            };
          }[];
          pageInfo: {
            startCursor: string;
            endCursor: string;
            hasNextPage: boolean;
            hasPreviousPage: boolean;
          };
          /** @min 0 */
          totalCount: number;
        },
        any
      >({
        path: `/PermissionAction`,
        method: 'GET',
        query: query,
        secure: true,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags PermissionAction
     * @name PermissionActionDetail
     * @request GET:/PermissionAction/{id}
     * @secure
     */
    permissionActionDetail: (id: string, params: RequestParams = {}) =>
      this.request<PermissionAction, any>({
        path: `/PermissionAction/${id}`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags PermissionAction
     * @name PermissionActionCreate
     * @request POST:/PermissionAction/{id}
     * @secure
     */
    permissionActionCreate: (id: string, data: PermissionAction, params: RequestParams = {}) =>
      this.request<PermissionAction, any>({
        path: `/PermissionAction/${id}`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags PermissionAction
     * @name PermissionActionUpdate
     * @request PUT:/PermissionAction/{id}
     * @secure
     */
    permissionActionUpdate: (id: string, data: PermissionAction, params: RequestParams = {}) =>
      this.request<PermissionAction, any>({
        path: `/PermissionAction/${id}`,
        method: 'PUT',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags PermissionAction
     * @name PermissionActionDelete
     * @request DELETE:/PermissionAction/{id}
     * @secure
     */
    permissionActionDelete: (id: string, params: RequestParams = {}) =>
      this.request<boolean, any>({
        path: `/PermissionAction/${id}`,
        method: 'DELETE',
        secure: true,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags PermissionAction
     * @name ReferencesByPermissionDetail
     * @request GET:/PermissionAction/{id}/references-by/Permission
     * @secure
     */
    referencesByPermissionDetail: (
      id: string,
      query: {
        /**
         * @min 1
         * @default 100
         */
        first: number;
        after?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          edges: {
            cursor: string;
            node: {
              id: string;
              versionId: string;
              createdAt: string;
              readonly: boolean;
            };
          }[];
          pageInfo: {
            startCursor: string;
            endCursor: string;
            hasNextPage: boolean;
            hasPreviousPage: boolean;
          };
          /** @min 0 */
          totalCount: number;
        },
        any
      >({
        path: `/PermissionAction/${id}/references-by/Permission`,
        method: 'GET',
        query: query,
        secure: true,
        format: 'json',
        ...params,
      }),
  };
  permissionSubject = {
    /**
     * No description
     *
     * @tags PermissionSubject
     * @name PermissionSubjectList
     * @request GET:/PermissionSubject
     * @secure
     */
    permissionSubjectList: (
      query: {
        /**
         * @min 1
         * @default 100
         */
        first: number;
        after?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          edges: {
            cursor: string;
            node: {
              id: string;
              versionId: string;
              createdAt: string;
              readonly: boolean;
            };
          }[];
          pageInfo: {
            startCursor: string;
            endCursor: string;
            hasNextPage: boolean;
            hasPreviousPage: boolean;
          };
          /** @min 0 */
          totalCount: number;
        },
        any
      >({
        path: `/PermissionSubject`,
        method: 'GET',
        query: query,
        secure: true,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags PermissionSubject
     * @name PermissionSubjectDetail
     * @request GET:/PermissionSubject/{id}
     * @secure
     */
    permissionSubjectDetail: (id: string, params: RequestParams = {}) =>
      this.request<PermissionSubject, any>({
        path: `/PermissionSubject/${id}`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags PermissionSubject
     * @name PermissionSubjectCreate
     * @request POST:/PermissionSubject/{id}
     * @secure
     */
    permissionSubjectCreate: (id: string, data: PermissionSubject, params: RequestParams = {}) =>
      this.request<PermissionSubject, any>({
        path: `/PermissionSubject/${id}`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags PermissionSubject
     * @name PermissionSubjectUpdate
     * @request PUT:/PermissionSubject/{id}
     * @secure
     */
    permissionSubjectUpdate: (id: string, data: PermissionSubject, params: RequestParams = {}) =>
      this.request<PermissionSubject, any>({
        path: `/PermissionSubject/${id}`,
        method: 'PUT',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags PermissionSubject
     * @name PermissionSubjectDelete
     * @request DELETE:/PermissionSubject/{id}
     * @secure
     */
    permissionSubjectDelete: (id: string, params: RequestParams = {}) =>
      this.request<boolean, any>({
        path: `/PermissionSubject/${id}`,
        method: 'DELETE',
        secure: true,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags PermissionSubject
     * @name ReferencesByPermissionDetail
     * @request GET:/PermissionSubject/{id}/references-by/Permission
     * @secure
     */
    referencesByPermissionDetail: (
      id: string,
      query: {
        /**
         * @min 1
         * @default 100
         */
        first: number;
        after?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          edges: {
            cursor: string;
            node: {
              id: string;
              versionId: string;
              createdAt: string;
              readonly: boolean;
            };
          }[];
          pageInfo: {
            startCursor: string;
            endCursor: string;
            hasNextPage: boolean;
            hasPreviousPage: boolean;
          };
          /** @min 0 */
          totalCount: number;
        },
        any
      >({
        path: `/PermissionSubject/${id}/references-by/Permission`,
        method: 'GET',
        query: query,
        secure: true,
        format: 'json',
        ...params,
      }),
  };
  role = {
    /**
     * No description
     *
     * @tags Role
     * @name RoleList
     * @request GET:/Role
     * @secure
     */
    roleList: (
      query: {
        /**
         * @min 1
         * @default 100
         */
        first: number;
        after?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          edges: {
            cursor: string;
            node: {
              id: string;
              versionId: string;
              createdAt: string;
              readonly: boolean;
            };
          }[];
          pageInfo: {
            startCursor: string;
            endCursor: string;
            hasNextPage: boolean;
            hasPreviousPage: boolean;
          };
          /** @min 0 */
          totalCount: number;
        },
        any
      >({
        path: `/Role`,
        method: 'GET',
        query: query,
        secure: true,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Role
     * @name RoleDetail
     * @request GET:/Role/{id}
     * @secure
     */
    roleDetail: (id: string, params: RequestParams = {}) =>
      this.request<Role, any>({
        path: `/Role/${id}`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Role
     * @name RoleCreate
     * @request POST:/Role/{id}
     * @secure
     */
    roleCreate: (id: string, data: Role, params: RequestParams = {}) =>
      this.request<Role, any>({
        path: `/Role/${id}`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Role
     * @name RoleUpdate
     * @request PUT:/Role/{id}
     * @secure
     */
    roleUpdate: (id: string, data: Role, params: RequestParams = {}) =>
      this.request<Role, any>({
        path: `/Role/${id}`,
        method: 'PUT',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Role
     * @name RoleDelete
     * @request DELETE:/Role/{id}
     * @secure
     */
    roleDelete: (id: string, params: RequestParams = {}) =>
      this.request<boolean, any>({
        path: `/Role/${id}`,
        method: 'DELETE',
        secure: true,
        format: 'json',
        ...params,
      }),
  };
  roleLevel = {
    /**
     * No description
     *
     * @tags RoleLevel
     * @name RoleLevelList
     * @request GET:/RoleLevel
     * @secure
     */
    roleLevelList: (
      query: {
        /**
         * @min 1
         * @default 100
         */
        first: number;
        after?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          edges: {
            cursor: string;
            node: {
              id: string;
              versionId: string;
              createdAt: string;
              readonly: boolean;
            };
          }[];
          pageInfo: {
            startCursor: string;
            endCursor: string;
            hasNextPage: boolean;
            hasPreviousPage: boolean;
          };
          /** @min 0 */
          totalCount: number;
        },
        any
      >({
        path: `/RoleLevel`,
        method: 'GET',
        query: query,
        secure: true,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags RoleLevel
     * @name RoleLevelDetail
     * @request GET:/RoleLevel/{id}
     * @secure
     */
    roleLevelDetail: (id: string, params: RequestParams = {}) =>
      this.request<RoleLevel, any>({
        path: `/RoleLevel/${id}`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags RoleLevel
     * @name RoleLevelCreate
     * @request POST:/RoleLevel/{id}
     * @secure
     */
    roleLevelCreate: (id: string, data: RoleLevel, params: RequestParams = {}) =>
      this.request<RoleLevel, any>({
        path: `/RoleLevel/${id}`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags RoleLevel
     * @name RoleLevelUpdate
     * @request PUT:/RoleLevel/{id}
     * @secure
     */
    roleLevelUpdate: (id: string, data: RoleLevel, params: RequestParams = {}) =>
      this.request<RoleLevel, any>({
        path: `/RoleLevel/${id}`,
        method: 'PUT',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags RoleLevel
     * @name RoleLevelDelete
     * @request DELETE:/RoleLevel/{id}
     * @secure
     */
    roleLevelDelete: (id: string, params: RequestParams = {}) =>
      this.request<boolean, any>({
        path: `/RoleLevel/${id}`,
        method: 'DELETE',
        secure: true,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags RoleLevel
     * @name ReferencesByRoleDetail
     * @request GET:/RoleLevel/{id}/references-by/Role
     * @secure
     */
    referencesByRoleDetail: (
      id: string,
      query: {
        /**
         * @min 1
         * @default 100
         */
        first: number;
        after?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          edges: {
            cursor: string;
            node: {
              id: string;
              versionId: string;
              createdAt: string;
              readonly: boolean;
            };
          }[];
          pageInfo: {
            startCursor: string;
            endCursor: string;
            hasNextPage: boolean;
            hasPreviousPage: boolean;
          };
          /** @min 0 */
          totalCount: number;
        },
        any
      >({
        path: `/RoleLevel/${id}/references-by/Role`,
        method: 'GET',
        query: query,
        secure: true,
        format: 'json',
        ...params,
      }),
  };
}
