import { useCallback, useEffect, useRef, useState } from 'react';
import { readApiKey } from '@/llm/api-key';
import { getChatProvider } from '@/llm/chat-provider';
import { createDispatcher } from '@/llm/create-dispatcher';
import { createProjectReader } from '@/llm/project-reader';
import { buildToolRegistry } from '@/llm/tools/index';
import type { LLMContentBlock, LLMMessage } from '@/llm/types';
import { useWorkspaceStore } from '../store';
import { PendingProposalsList } from './ProposalCard';
import { ToolUseCard, ToolResultCard } from './ToolCallCard';

function ContentBlockView({
  block,
  streamingCursor,
}: {
  readonly block: LLMContentBlock;
  readonly streamingCursor: boolean;
}): JSX.Element | null {
  if (block.type === 'text') {
    return (
      <span>
        {block.text}
        {streamingCursor && (
          <span
            aria-hidden="true"
            className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-current opacity-70"
          />
        )}
      </span>
    );
  }
  if (block.type === 'tool_use') {
    return <ToolUseCard block={block} />;
  }
  if (block.type === 'tool_result') {
    return <ToolResultCard block={block} />;
  }
  return null;
}

function MessageBubble({
  message,
  streaming,
}: {
  readonly message: LLMMessage;
  readonly streaming: boolean;
}): JSX.Element {
  const isUser = message.role === 'user';

  // User messages that contain only tool_result blocks are rendered without a bubble
  const hasOnlyToolResults =
    message.content.length > 0 && message.content.every((b) => b.type === 'tool_result');

  if (hasOnlyToolResults) {
    return (
      <div data-testid="chat-message" data-role={message.role} className="mb-1">
        {message.content.map((block, i) =>
          block.type === 'tool_result' ? <ToolResultCard key={i} block={block} /> : null,
        )}
      </div>
    );
  }

  return (
    <div
      data-testid="chat-message"
      data-role={message.role}
      data-streaming={streaming ? 'true' : undefined}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}
    >
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
        }`}
      >
        {message.content.map((block, i) => {
          const isLastBlock = i === message.content.length - 1;
          const showCursor = streaming && isLastBlock && block.type === 'text';
          return <ContentBlockView key={i} block={block} streamingCursor={showCursor} />;
        })}
      </div>
    </div>
  );
}

export function ChatPane(): JSX.Element {
  const project = useWorkspaceStore((s) => s.project);
  const activeConversationId = useWorkspaceStore((s) => s.activeConversationId);
  const createConversation = useWorkspaceStore((s) => s.createConversation);
  const appendUserMessage = useWorkspaceStore((s) => s.appendUserMessage);
  const clearConversations = useWorkspaceStore((s) => s.clearConversations);

  const [composerText, setComposerText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const conversations = project?.conversations ?? [];
  const activeConversation = conversations.find((c) => c.id === activeConversationId) ?? null;
  const messages = activeConversation?.messages ?? [];

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length, isStreaming]);

  const handleNewChat = useCallback(() => {
    createConversation();
    setComposerText('');
  }, [createConversation]);

  const handleClearHistory = useCallback(() => {
    clearConversations();
    setComposerText('');
  }, [clearConversations]);

  const handleSend = useCallback(async () => {
    const text = composerText.trim();
    if (text.length === 0 || isStreaming) return;

    const apiKey = readApiKey();
    if (apiKey === null) return;

    setComposerText('');
    appendUserMessage(text);
    setIsStreaming(true);

    try {
      const provider = getChatProvider(apiKey);

      // Build the registry with a reader that reads from the store at handler call time
      const getReader = () => {
        const s = useWorkspaceStore.getState();
        return createProjectReader({
          projectName: s.project?.name ?? 'Untitled Project',
          elements: s.elements,
          edges: s.edges,
          diagrams: s.diagrams,
          activeDiagramId: s.activeDiagramId,
        });
      };

      const registry = buildToolRegistry(getReader);
      const resolveProposal = useWorkspaceStore.getState().enqueueProposal;
      const dispatch = createDispatcher({ provider, registry, resolveProposal });

      // Build the current conversation message list (includes user message just appended)
      const stateNow = useWorkspaceStore.getState();
      const currentMessages =
        stateNow.project?.conversations.find((c) => c.id === stateNow.activeConversationId)
          ?.messages ?? [];

      // priorMessages = all but the last (user message we just added)
      const priorMessages = currentMessages.slice(0, -1);
      const userMessage: LLMMessage = currentMessages[currentMessages.length - 1] ?? {
        role: 'user',
        content: [{ type: 'text', text }],
      };

      const conversationId = stateNow.activeConversationId ?? 'unknown';

      const result = await dispatch({
        conversationId,
        system:
          'You are the MBSE Workbench assistant. You have access to tools to read the active model.',
        priorMessages,
        userMessage,
        maxTokens: 1024,
      });

      // Persist all returned messages (skip index 0 = user message already appended)
      const { appendRawMessage } = useWorkspaceStore.getState();
      for (const msg of result.appendedMessages.slice(1)) {
        appendRawMessage(msg);
      }
    } finally {
      setIsStreaming(false);
    }
  }, [composerText, isStreaming, appendUserMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        void handleSend();
      }
    },
    [handleSend],
  );

  const conversationTitle = activeConversation?.title ?? 'Chat';

  if (activeConversation === null) {
    return (
      <div
        data-testid="chat-empty"
        className="flex h-full flex-col items-center justify-center gap-3 text-center"
      >
        <p className="text-sm text-muted-foreground">Start a new conversation</p>
        <button
          type="button"
          data-testid="chat-new"
          onClick={handleNewChat}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          New chat
        </button>
      </div>
    );
  }

  return (
    <div data-testid="chat-pane" className="flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
        <span
          data-testid="chat-title"
          className="truncate text-xs font-medium text-foreground"
          title={conversationTitle}
        >
          {conversationTitle}
        </span>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            data-testid="chat-new"
            aria-label="New chat"
            onClick={handleNewChat}
            className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            New
          </button>
          <button
            type="button"
            data-testid="chat-clear"
            aria-label="Clear history"
            onClick={handleClearHistory}
            className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Scrollback */}
      <div
        ref={scrollRef}
        data-testid="chat-scrollback"
        className="flex-1 overflow-y-auto px-3 py-2"
      >
        {messages.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground">
            Send a message to get started.
          </p>
        ) : (
          messages.map((msg, idx) => {
            const isLast = idx === messages.length - 1;
            const isStreamingThis = isStreaming && isLast && msg.role === 'assistant';
            return <MessageBubble key={idx} message={msg} streaming={isStreamingThis} />;
          })
        )}
      </div>

      <PendingProposalsList />

      {/* Composer */}
      <div className="shrink-0 border-t border-border p-3">
        <div className="flex gap-2">
          <textarea
            data-testid="chat-composer"
            aria-label="Message composer"
            value={composerText}
            onChange={(e) => setComposerText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            rows={2}
            placeholder="Type a message… (⌘↵ to send)"
            className="flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          />
          <button
            type="button"
            data-testid="chat-send"
            aria-label="Send message"
            onClick={() => void handleSend()}
            disabled={isStreaming || composerText.trim().length === 0}
            className="self-end rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
