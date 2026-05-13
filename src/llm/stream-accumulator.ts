import type { LLMEvent } from './types';

/**
 * Consumes an AsyncIterable<LLMEvent> stream, calling callbacks for each
 * text delta and when the message is done.
 *
 * Pure function — no React or store dependencies.
 */
export async function accumulateStream(
  events: AsyncIterable<LLMEvent>,
  onTextDelta: (delta: string) => void,
  onStop: () => void,
): Promise<void> {
  for await (const event of events) {
    switch (event.kind) {
      case 'text_delta':
        onTextDelta(event.text);
        break;
      case 'message_stop':
        onStop();
        break;
      case 'content_block_start':
      case 'content_block_stop':
      case 'input_json_delta':
        // Not rendered in slice C — skip gracefully
        break;
    }
  }
}
