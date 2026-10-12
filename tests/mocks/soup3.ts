/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi } from 'vitest';
import { Bytes } from './glib2';

export enum Status {
  OK = 200,
  NOT_FOUND = 404,
  BAD_REQUEST = 400,
  INTERNAL_SERVER_ERROR = 500,
}

export const status_get_phrase = vi.fn((code: number) => {
  if (code === 200) return 'OK';
  if (code === 404) return 'Not Found';
  if (code === 400) return 'Bad Request';
  return 'Unknown';
});

export const form_encode_hash = vi.fn((params: Record<string, string>) => {
  return Object.keys(params)
    .map((k) => `${k}=${params[k]}`)
    .join('&');
});

export class MessageHeaders {
  public headers: Record<string, string> = {};
  append(name: string, value: string): void {
    this.headers[name] = value;
  }
}

export class Message {
  public method: string;
  public uri: string;
  public request_headers = new MessageHeaders();
  public statusCode = Status.OK;
  public requestContentType = '';
  public requestBodyBytes: Bytes | null = null;

  constructor(method: string, uri: string) {
    this.method = method;
    this.uri = uri;
  }

  static new(method: string, uri: string): Message {
    return new Message(method, uri);
  }

  static new_from_encoded_form(method: string, uri: string, query: string): Message {
    return new Message(method, `${uri}?${query}`);
  }

  set_request_body_from_bytes(contentType: string, bytes: Bytes): void {
    this.requestContentType = contentType;
    this.requestBodyBytes = bytes;
  }
}

export class Session {
  public static mockResponseBytes: Bytes | null = new Bytes(new Uint8Array());
  public static mockStatusCode = Status.OK;
  public static lastMessage: Message | null = null;

  async send_and_read_async(msg: Message, _priority: number, _cancellable: any): Promise<Bytes> {
    Session.lastMessage = msg;
    msg.statusCode = Session.mockStatusCode;
    return Session.mockResponseBytes as Bytes;
  }
}
