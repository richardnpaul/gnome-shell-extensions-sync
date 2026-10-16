export interface HttpRequest {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface HttpResponse {
  status: number;
  statusText: string;
  body: string;
}

export interface HttpTransportPort {
  request(req: HttpRequest): Promise<HttpResponse>;
}
