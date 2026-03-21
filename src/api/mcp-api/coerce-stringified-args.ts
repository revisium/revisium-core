/**
 * Workaround for Claude Code CLI bug where nested object/array
 * tool arguments are serialized as JSON strings instead of native objects.
 *
 * @see https://github.com/anthropics/claude-code/issues/5504
 * @see https://github.com/anthropics/claude-code/issues/22394
 */
export function coerceStringifiedArgs(
  args: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!args) {
    return args;
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(args)) {
    if (typeof value === 'string' && isJsonObjectOrArray(value)) {
      try {
        result[key] = JSON.parse(value);
      } catch {
        result[key] = value;
      }
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Applies coercion to JSON-RPC request body.
 * Handles both single messages and batch arrays.
 * Only transforms `tools/call` messages.
 */
export function coerceJsonRpcBody(body: unknown): unknown {
  if (Array.isArray(body)) {
    return body.map(coerceJsonRpcMessage);
  }
  return coerceJsonRpcMessage(body);
}

function coerceJsonRpcMessage(message: unknown): unknown {
  if (
    !message ||
    typeof message !== 'object' ||
    !('method' in message) ||
    !('params' in message)
  ) {
    return message;
  }

  const msg = message as {
    method: string;
    params?: { arguments?: Record<string, unknown> };
  };

  const args = msg.params?.arguments;
  if (
    msg.method !== 'tools/call' ||
    !args ||
    typeof args !== 'object' ||
    Array.isArray(args)
  ) {
    return message;
  }

  return {
    ...msg,
    params: {
      ...msg.params,
      arguments: coerceStringifiedArgs(args as Record<string, unknown>),
    },
  };
}

function isJsonObjectOrArray(value: string): boolean {
  const trimmed = value.trimStart();
  return trimmed.startsWith('{') || trimmed.startsWith('[');
}
