import {
  infiniteQueryOptions,
  queryOptions,
  type DefaultError,
  type QueryKey,
  type UseInfiniteQueryOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import type { QueryFunction } from '@tanstack/query-core';

/**
 * Helpers to build typed query option factories that work across TanStack Query contexts.
 */
export type QueryOverrides<
  TQueryFnData,
  TError,
  TData,
  TQueryKey extends QueryKey,
> = Partial<Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, 'queryKey' | 'queryFn'>>;

export type InfiniteQueryOverrides<
  TQueryFnData,
  TError,
  TData,
  TQueryKey extends QueryKey,
  TPageParam,
> = Partial<
  InfiniteQueryBaseOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>
>;

type InfiniteQueryBaseOptions<
  TQueryFnData,
  TError,
  TData,
  TQueryKey extends QueryKey,
  TPageParam,
> = Omit<UseInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>, 'queryKey' | 'queryFn'>;

export interface DynamicQueryConfig<
  TParams,
  TQueryFnData,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> {
  getQueryKey: (params: TParams) => TQueryKey;
  getQueryFn: (params: TParams) => QueryFunction<TQueryFnData, TQueryKey>;
  /**
   * Optional defaults applied before per-call overrides.
   */
  baseOptions?:
    | QueryOverrides<TQueryFnData, TError, TData, TQueryKey>
    | ((params: TParams) => QueryOverrides<TQueryFnData, TError, TData, TQueryKey>);
}

export interface DynamicInfiniteQueryConfig<
  TParams,
  TQueryFnData,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = unknown,
> {
  getQueryKey: (params: TParams) => TQueryKey;
  getQueryFn: (params: TParams) => QueryFunction<TQueryFnData, TQueryKey, TPageParam>;
  /**
   * Provides the base infinite query configuration (must include page-param callbacks).
   */
  getBaseOptions: (params: TParams) => InfiniteQueryBaseOptions<
    TQueryFnData,
    TError,
    TData,
    TQueryKey,
    TPageParam
  >;
}

export type DynamicQueryFactory<
  TParams,
  TQueryFnData,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> = (
  params: TParams,
  overrides?: QueryOverrides<TQueryFnData, TError, TData, TQueryKey>,
) => UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>;

export type DynamicInfiniteQueryFactory<
  TParams,
  TQueryFnData,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = unknown,
> = (
  params: TParams,
  overrides?: InfiniteQueryOverrides<TQueryFnData, TError, TData, TQueryKey, TPageParam>,
) => UseInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>;

/**
 * Builds a reusable factory that returns {@link queryOptions} with strong typing for dynamic params.
 */
export function createDynamicQueryOptions<
  TParams,
  TQueryFnData,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(config: DynamicQueryConfig<TParams, TQueryFnData, TError, TData, TQueryKey>): DynamicQueryFactory<
  TParams,
  TQueryFnData,
  TError,
  TData,
  TQueryKey
> {
  const { getQueryKey, getQueryFn, baseOptions } = config;

  return (params, overrides) => {
    const resolvedBase =
      typeof baseOptions === 'function' ? baseOptions(params) : baseOptions ?? {};

    return queryOptions({
      queryKey: getQueryKey(params),
      queryFn: getQueryFn(params),
      ...resolvedBase,
      ...(overrides ?? {}),
    });
  };
}

/**
 * Builds a reusable factory that returns {@link infiniteQueryOptions} for paginated resources.
 */
export function createDynamicInfiniteQueryOptions<
  TParams,
  TQueryFnData,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = unknown,
>(
  config: DynamicInfiniteQueryConfig<TParams, TQueryFnData, TError, TData, TQueryKey, TPageParam>,
): DynamicInfiniteQueryFactory<
  TParams,
  TQueryFnData,
  TError,
  TData,
  TQueryKey,
  TPageParam
> {
  const { getQueryKey, getQueryFn, getBaseOptions } = config;

  return (params, overrides) =>
    infiniteQueryOptions({
      ...getBaseOptions(params),
      ...(overrides ?? {}),
      queryKey: getQueryKey(params),
      queryFn: getQueryFn(params),
    });
}

export function mergeQueryOverrides<
  TQueryFnData,
  TError,
  TData,
  TQueryKey extends QueryKey,
>(
  ...sources: Array<QueryOverrides<TQueryFnData, TError, TData, TQueryKey> | undefined>
): QueryOverrides<TQueryFnData, TError, TData, TQueryKey> {
  const definedSources = sources.filter(
    (source): source is QueryOverrides<TQueryFnData, TError, TData, TQueryKey> => source != null,
  );

  return Object.assign({}, ...definedSources);
}

export function mergeInfiniteQueryOverrides<
  TQueryFnData,
  TError,
  TData,
  TQueryKey extends QueryKey,
  TPageParam,
>(
  ...sources: Array<
    InfiniteQueryOverrides<TQueryFnData, TError, TData, TQueryKey, TPageParam> | undefined
  >
): InfiniteQueryOverrides<TQueryFnData, TError, TData, TQueryKey, TPageParam> {
  const definedSources = sources.filter(
    (
      source,
    ): source is InfiniteQueryOverrides<TQueryFnData, TError, TData, TQueryKey, TPageParam> =>
      source != null,
  );

  return Object.assign({}, ...definedSources);
}
