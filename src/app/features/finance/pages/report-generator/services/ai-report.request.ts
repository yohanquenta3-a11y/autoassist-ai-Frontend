import { User } from '@features/identity/auth/schemas/auth.schema';

export interface AiReportRequest {
  action: 'sendMessage';
  sessionId: string;
  chatInput: string;
  user?: User;
}

export function buildAiReportRequest(
  chatInput: string,
  sessionId: string,
  user?: User | null
): AiReportRequest {
  const request: AiReportRequest = {
    action: 'sendMessage',
    sessionId,
    chatInput
  };

  if (user) {
    request.user = user;
  }

  return request;
}
