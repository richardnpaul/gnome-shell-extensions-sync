import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Soup3Transport } from '@esync/platform/http/soup3Transport';
import { Session, Status } from '@gi-types/soup3';
import { Bytes } from '@gi-types/glib2';

describe('Soup3Transport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Session.mockStatusCode = Status.OK;
    Session.mockResponseBytes = new Bytes(new TextEncoder().encode('{"test": true}'));
    Session.lastMessage = null;
  });

  it('initializes with default session when none provided', () => {
    const transport = new Soup3Transport();
    expect(transport).toBeDefined();
  });

  it('initializes with custom session', () => {
    const customSession = new Session();
    const transport = new Soup3Transport(customSession);
    expect(transport).toBeDefined();
  });

  it('performs request without headers or body', async () => {
    const transport = new Soup3Transport();
    const response = await transport.request({
      method: 'GET',
      url: 'https://api.example.com/test',
    });

    expect(response.status).toBe(200);
    expect(response.body).toBe('{"test": true}');
    expect(Session.lastMessage?.method).toBe('GET');
    expect(Session.lastMessage?.uri).toBe('https://api.example.com/test');
    expect(Session.lastMessage?.requestBodyBytes).toBeNull();
  });

  it('performs request with headers and body', async () => {
    const transport = new Soup3Transport();
    const response = await transport.request({
      method: 'POST',
      url: 'https://api.example.com/post',
      headers: {
        'User-Agent': 'CustomAgent',
        Authorization: 'token 12345',
      },
      body: JSON.stringify({ name: 'hello' }),
    });

    expect(response.status).toBe(200);
    expect(response.body).toBe('{"test": true}');
    expect(Session.lastMessage?.method).toBe('POST');
    expect(Session.lastMessage?.request_headers.headers['User-Agent']).toBe('CustomAgent');
    expect(Session.lastMessage?.request_headers.headers['Authorization']).toBe('token 12345');
    expect(Session.lastMessage?.requestContentType).toBe('application/json');
    expect(Session.lastMessage?.requestBodyBytes).not.toBeNull();
  });

  it('handles null responseBytes gracefully', async () => {
    Session.mockResponseBytes = null;
    const transport = new Soup3Transport();
    const response = await transport.request({
      method: 'GET',
      url: 'https://api.example.com/null',
    });

    expect(response.status).toBe(200);
    expect(response.body).toBe('');
  });

  it('handles empty response bytes gracefully', async () => {
    Session.mockResponseBytes = new Bytes(new Uint8Array(0));
    const transport = new Soup3Transport();
    const response = await transport.request({
      method: 'GET',
      url: 'https://api.example.com/empty',
    });

    expect(response.status).toBe(200);
    expect(response.body).toBe('');
  });
});
