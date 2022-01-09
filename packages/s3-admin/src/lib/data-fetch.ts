import { QueryFunctionContext, useQuery, UseQueryOptions } from "react-query";
import axios from "axios";

export const axiosApiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BACKEND + "/api",
});

axiosApiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("x-api-token");
  if (token) {
    config.headers.authorization = token;
  }
  return config;
});

export const axiosClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BACKEND,
});

export const useFetchQuery = <K = {}>(
  path: string,
  opts?: Omit<UseQueryOptions<K, unknown, K, string>, "queryKey" | "queryFn">
) =>
  useQuery<K>(
    path,
    (cfn) => axiosApiClient.get(path, cfn).then(({ data }) => data),
    opts
  );
