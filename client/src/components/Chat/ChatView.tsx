import { memo, useCallback } from 'react';
import { useRecoilValue } from 'recoil';
import { useForm } from 'react-hook-form';
import { Spinner } from '@librechat/client';
import { useParams } from 'react-router-dom';
import { Constants, buildTree, isAgentsEndpoint } from 'librechat-data-provider';
import type { TMessage } from 'librechat-data-provider';
import type { ChatFormValues } from '~/common';
import { ChatContext, AddedChatContext, ChatFormProvider, useFileMapContext } from '~/Providers';
import { useAddedResponse, useResumeOnLoad, useAdaptiveSSE, useChatHelpers } from '~/hooks';
import ConversationStarters from './Input/ConversationStarters';
import { useGetMessagesByConvoId } from '~/data-provider';
import AgentPanelSwitch from '~/components/SidePanel/Agents/AgentPanelSwitch';
import MessagesView from './Messages/MessagesView';
import Presentation from './Presentation';
import ChatForm from './Input/ChatForm';
import Landing from './Landing';
import Header from './Header';
import Footer from './Footer';
import { cn } from '~/utils';
import store from '~/store';

function LoadingSpinner() {
  return (
    <div className="relative flex-1 overflow-hidden overflow-y-auto">
      <div className="relative flex h-full items-center justify-center">
        <Spinner className="text-text-primary" />
      </div>
    </div>
  );
}

function ChatView({ index = 0 }: { index?: number }) {
  const { conversationId } = useParams();
  const rootSubmission = useRecoilValue(store.submissionByIndex(index));
  const centerFormOnLanding = useRecoilValue(store.centerFormOnLanding);

  const methods = useForm<ChatFormValues>({
    defaultValues: { text: '' },
  });

  const fileMap = useFileMapContext();

  const { data: messagesTree = null, isLoading } = useGetMessagesByConvoId(conversationId ?? '', {
    select: useCallback(
      (data: TMessage[]) => {
        const dataTree = buildTree({ messages: data, fileMap });
        return dataTree?.length === 0 ? null : (dataTree ?? null);
      },
      [fileMap],
    ),
    enabled: !!fileMap,
  });

  const chatHelpers = useChatHelpers(index, conversationId);
  const addedChatHelpers = useAddedResponse();

  /* [EXT] Phase J.13 Navvia: Agent Builder como aside direito quando endpoint=agents.
   * Bate com design/ui-preview.html linha 1026: <aside id="builder" w-[400px] border-l>.
   * Não há equivalente upstream nesta UI — o LibreChat original usa UnifiedSidebar's
   * SidePanelNav (que substituímos por NavviaSidebar). */
  const isAgentsConvo = isAgentsEndpoint(chatHelpers.conversation?.endpoint);

  useAdaptiveSSE(rootSubmission, chatHelpers, false, index);

  // Auto-resume if navigating back to conversation with active job
  // Wait for messages to load before resuming to avoid race condition
  useResumeOnLoad(conversationId, chatHelpers.getMessages, index, !isLoading);

  let content: JSX.Element | null | undefined;
  const isLandingPage =
    (!messagesTree || messagesTree.length === 0) &&
    (conversationId === Constants.NEW_CONVO || !conversationId);
  const isNavigating = (!messagesTree || messagesTree.length === 0) && conversationId != null;

  if (isLoading && conversationId !== Constants.NEW_CONVO) {
    content = <LoadingSpinner />;
  } else if ((isLoading || isNavigating) && !isLandingPage) {
    content = <LoadingSpinner />;
  } else if (!isLandingPage) {
    content = <MessagesView messagesTree={messagesTree} />;
  } else {
    content = <Landing centerFormOnLanding={centerFormOnLanding} />;
  }

  return (
    <ChatFormProvider {...methods}>
      <ChatContext.Provider value={chatHelpers}>
        <AddedChatContext.Provider value={addedChatHelpers}>
          <div className="flex h-full w-full">
            <Presentation>
              <div className="relative flex h-full w-full flex-col">
                <Header />
                <>
                  <div
                    className={cn(
                      'flex flex-col',
                      isLandingPage
                        ? 'flex-1 items-center justify-end sm:justify-center'
                        : 'h-full overflow-y-auto',
                    )}
                  >
                    {content}
                    <div
                      className={cn(
                        'w-full',
                        isLandingPage && 'max-w-3xl transition-all duration-200 xl:max-w-4xl',
                      )}
                    >
                      <ChatForm index={index} />
                      {isLandingPage ? <ConversationStarters /> : <Footer />}
                    </div>
                  </div>
                  {isLandingPage && <Footer />}
                </>
              </div>
            </Presentation>
            {isAgentsConvo && (
              <aside
                className="hidden w-[400px] shrink-0 flex-col overflow-hidden border-l border-border-light bg-surface-secondary md:flex"
                aria-label="Agent Builder"
              >
                <AgentPanelSwitch />
              </aside>
            )}
          </div>
        </AddedChatContext.Provider>
      </ChatContext.Provider>
    </ChatFormProvider>
  );
}

export default memo(ChatView);
