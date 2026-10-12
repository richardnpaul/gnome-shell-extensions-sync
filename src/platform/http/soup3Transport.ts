import { HttpRequest, HttpResponse, HttpTransportPort } from '@esync/core/ports';
import { Bytes, PRIORITY_DEFAULT } from '@gi-types/glib2';
import { Message, Session, status_get_phrase } from '@gi-types/soup3';

export class Soup3Transport implements HttpTransportPort {
  private session: Session;

  constructor(session?: Session) {
    this.session = session || new Session();
  }

  async request(req: HttpRequest): Promise<HttpResponse> {
    const message = Message.new(req.method, req.url);

    if (req.headers) {
      for (const [key, value] of Object.entries(req.headers)) {
        message.request_headers.append(key, value);
      }
    }

    if (req.body) {
      message.set_request_body_from_bytes('application/json', new Bytes(new TextEncoder().encode(req.body)));
    }

    const responseBytes = await this.session.send_and_read_async(message, PRIORITY_DEFAULT, null);
    const data = responseBytes ? responseBytes.get_data() : null;
    const body = data ? new TextDecoder().decode(data) : '';

    return {
      status: message.statusCode,
      statusText: status_get_phrase(message.statusCode),
      body,
    };
  }
}
