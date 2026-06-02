import HomeView from '~/components/Home/HomeView';
import BadgeRowProvider from '~/Providers/BadgeRowContext';

/**
 * [EXT] /home route — Navvia dashboard. Opt-in via librechat.yaml
 * interface.home: 'dashboard'.
 *
 * [EXT] Phase J.25: BadgeRowProvider habilita os toggles do dropdown
 * "Ferramentas" no composer da home (Web search / Code interpreter /
 * File search / Artifacts). Sem conversationId, o provider usa
 * Constants.NEW_CONVO — valores ficam em localStorage e o chat criado
 * pelo Send pega esses padrões on mount.
 */
export default function HomeRoute() {
  return (
    <BadgeRowProvider>
      <HomeView />
    </BadgeRowProvider>
  );
}
