import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosHeaders, AxiosRequestConfig, AxiosResponse } from 'axios';
import { lastValueFrom } from 'rxjs';
import { getRequestContext } from '../common/context/request-context';

@Injectable()
export class HttpClientService {
  private readonly logger = new Logger(HttpClientService.name);

  constructor(private readonly httpService: HttpService) {
    this.httpService.axiosRef.interceptors.request.use((config) => {
      const requestId = getRequestContext()?.requestId;
      if (requestId) {
        const headers = AxiosHeaders.from(config.headers ?? {});
        headers.set('x-request-id', requestId);
        config.headers = headers;
      }

      (config as AxiosRequestConfig & { metadata?: { start: number } }).metadata = {
        start: Date.now()
      };

      const method = config.method?.toUpperCase() || 'GET';
      const url = this.buildUrl(config);
      this.logger.log(`Outbound ${method} ${url}`);

      return config;
    });

    this.httpService.axiosRef.interceptors.response.use(
      (response) => {
        const duration = this.getDuration(response.config);
        const method = response.config.method?.toUpperCase() || 'GET';
        const url = this.buildUrl(response.config);
        this.logger.log(`Outbound ${response.status} ${method} ${url} ${duration}ms`);
        return response;
      },
      (error) => {
        const config = error.config || {};
        const duration = this.getDuration(config);
        const method = config.method?.toUpperCase() || 'GET';
        const url = this.buildUrl(config);
        const status = error.response?.status ?? 'ERR';
        this.logger.error(`Outbound ${status} ${method} ${url} ${duration}ms`);
        return Promise.reject(error);
      }
    );
  }

  async request<T = unknown>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return lastValueFrom(this.httpService.request<T>(config));
  }

  async get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request({ ...config, method: 'GET', url });
  }

  async post<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.request({ ...config, method: 'POST', url, data });
  }

  private buildUrl(config: AxiosRequestConfig) {
    if (!config.baseURL) {
      return config.url || '';
    }

    return `${config.baseURL}${config.url || ''}`;
  }

  private getDuration(config: AxiosRequestConfig) {
    const start = (config as AxiosRequestConfig & { metadata?: { start: number } }).metadata?.start;
    if (!start) {
      return 0;
    }

    return Date.now() - start;
  }
}
