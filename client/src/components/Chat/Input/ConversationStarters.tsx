import { useMemo, useCallback } from 'react';
import { EModelEndpoint, Constants } from 'librechat-data-provider';
import { useChatContext, useAgentsMapContext, useAssistantsMapContext } from '~/Providers';
import { useGetAssistantDocsQuery, useGetEndpointsQuery } from '~/data-provider';
import { getIconEndpoint, getEntity } from '~/utils';
import { useLocalize, useSubmitMessage } from '~/hooks';
import type { TranslationKeys } from '~/hooks';

/* [EXT] Phase D.5 Navvia: starters genéricos default quando não há agent
 * nem assistant. Faz a Landing chat coincidir com o protótipo (que mostra
 * 4 sugestões em grid mesmo sem agent). Usa i18n para suportar en+pt-BR. */
const GENERIC_STARTER_KEYS: TranslationKeys[] = [
  'com_nav_home_chip_summary',  // Resumir texto
  'com_nav_home_chip_code',     // Escrever código
  'com_nav_home_chip_doc',      // Analisar documento
  'com_nav_home_chip_search',   // Busca web
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
    <div className="mt-8 flex flex-wrap justify-center gap-3 px-4">
      {conversation_starters
        .slice(0, Constants.MAX_CONVO_STARTERS)
        .map((text: string, index: number) => (
          /* [EXT] Phase D.4 Navvia: usar .starter do protótipo
           * (design/ui-preview.html linha 401-402): border-light + bg secondary,
           * hover border-medium + bg-hover + lift -1px. Mantém w-40 + line-clamp. */
          <button
            key={index}
            onClick={() => sendConversationStarter(text)}
            className="starter fade-in flex w-40 flex-col gap-2"
          >
            <p className="line-clamp-3 overflow-hidden text-balance break-words text-text-secondary">
              {text}
            </p>
          </button>
        ))}
    </div>
  );
};

export default ConversationStarters;
