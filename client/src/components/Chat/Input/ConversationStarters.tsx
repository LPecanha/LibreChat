import { useMemo, useCallback } from 'react';
import { EModelEndpoint, Constants } from 'librechat-data-provider';
import { useChatContext, useAgentsMapContext, useAssistantsMapContext } from '~/Providers';
import { useGetAssistantDocsQuery, useGetEndpointsQuery } from '~/data-provider';
import { getIconEndpoint, getEntity } from '~/utils';
import { useLocalize, useSubmitMessage } from '~/hooks';
import type { TranslationKeys } from '~/hooks';

/* [EXT] Phase J.8 Navvia: starters genéricos default da chat landing.
 * Conteúdo bate com DEFAULT_STARTERS do protótipo (ui-preview.html:1867):
 * "Resuma este conteúdo / Crie um plano de ação / Explique de forma simples /
 *  Dê exemplos práticos". Usa keys i18n próprias p/ separar do home (que tem
 *  ações específicas — gerar imagem, busca web, etc.). */
const GENERIC_STARTER_KEYS: TranslationKeys[] = [
  'com_nav_chat_starter_summary',
  'com_nav_chat_starter_plan',
  'com_nav_chat_starter_explain',
  'com_nav_chat_starter_examples',
];

const ConversationStarters = () => {
  const localize = useLocalize();
  const { conversation } = useChatContext();
  const agentsMap = useAgentsMapContext();
  const assistantMap = useAssistantsMapContext();
  const { data: endpointsConfig } = useGetEndpointsQuery();

  const endpointType = useMemo(() => {
    let ep = conversation?.endpoint ?? '';
    if (ep === EModelEndpoint.azureOpenAI) {
      ep = EModelEndpoint.openAI;
    }
    return getIconEndpoint({
      endpointsConfig,
      iconURL: conversation?.iconURL,
      endpoint: ep,
    });
  }, [conversation?.endpoint, conversation?.iconURL, endpointsConfig]);

  const { data: documentsMap = new Map() } = useGetAssistantDocsQuery(endpointType, {
    select: (data) => new Map(data.map((dbA) => [dbA.assistant_id, dbA])),
  });

  const { entity, isAgent } = getEntity({
    endpoint: endpointType,
    agentsMap,
    assistantMap,
    agent_id: conversation?.agent_id,
    assistant_id: conversation?.assistant_id,
  });

  const conversation_starters = useMemo(() => {
    if (entity?.conversation_starters?.length) {
      return entity.conversation_starters;
    }

    if (isAgent) {
      return [];
    }

    const fromDocs = documentsMap.get(entity?.id ?? '')?.conversation_starters ?? [];
    if (fromDocs.length) return fromDocs;

    /* [EXT] Phase D.5: fallback p/ starters genéricos quando não há agent/assistant
     * com starters configurados. Replica o comportamento do protótipo HTML que
     * sempre mostra 4 sugestões na landing. */
    return GENERIC_STARTER_KEYS.map((k) => localize(k));
  }, [documentsMap, isAgent, entity, localize]);

  const { submitMessage } = useSubmitMessage();
  const sendConversationStarter = useCallback(
    (text: string) => submitMessage({ text }),
    [submitMessage],
  );

  if (!conversation_starters.length) {
    return null;
  }

  return (
    /* [EXT] Phase J.15 Navvia: mt-6 max-w-xl gap-2 (alinhado com proto linha 812:
     * <div id="landingStarters" class="mt-6 grid w-full max-w-xl grid-cols-1
     *                                     gap-2 sm:grid-cols-2">). */
    <div className="mx-auto mt-6 grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
      {conversation_starters
        .slice(0, Constants.MAX_CONVO_STARTERS)
        .map((text: string, index: number) => (
          <button
            key={index}
            onClick={() => sendConversationStarter(text)}
            className="starter fade-in"
          >
            <span className="text-brand" aria-hidden>✦</span>
            <span className="line-clamp-2 text-left">{text}</span>
          </button>
        ))}
    </div>
  );
};

export default ConversationStarters;
