export const SystemCapabilities = {
  ACCESS_ADMIN: 'access:admin',
  READ_USERS: 'read:users',
  MANAGE_USERS: 'manage:users',
  READ_GROUPS: 'read:groups',
  MANAGE_GROUPS: 'manage:groups',
  READ_ROLES: 'read:roles',
  MANAGE_ROLES: 'manage:roles',
  READ_CONFIGS: 'read:configs',
  MANAGE_CONFIGS: 'manage:configs',
  ASSIGN_CONFIGS: 'assign:configs',
  READ_USAGE: 'read:usage',
  READ_AGENTS: 'read:agents',
  MANAGE_AGENTS: 'manage:agents',
  MANAGE_MCP_SERVERS: 'manage:mcpservers',
  READ_PROMPTS: 'read:prompts',
  MANAGE_PROMPTS: 'manage:prompts',
  READ_ASSISTANTS: 'read:assistants',
  MANAGE_ASSISTANTS: 'manage:assistants',
} as const;

export type SystemCapability = (typeof SystemCapabilities)[keyof typeof SystemCapabilities];

export const CAPABILITY_LABELS: Record<string, string> = {
  'access:admin': 'Acesso ao admin',
  'read:users': 'Ler usuários',
  'manage:users': 'Gerenciar usuários',
  'read:groups': 'Ler grupos',
  'manage:groups': 'Gerenciar grupos',
  'read:roles': 'Ler papéis',
  'manage:roles': 'Gerenciar papéis',
  'read:configs': 'Ler configurações',
  'manage:configs': 'Gerenciar configurações',
  'assign:configs': 'Atribuir configurações',
  'read:usage': 'Ler uso',
  'read:agents': 'Ler agentes',
  'manage:agents': 'Gerenciar agentes',
  'manage:mcpservers': 'Gerenciar MCP Servers',
  'read:prompts': 'Ler prompts',
  'manage:prompts': 'Gerenciar prompts',
  'read:assistants': 'Ler assistants',
  'manage:assistants': 'Gerenciar assistants',
};

export const CAPABILITY_CATEGORIES: { label: string; caps: SystemCapability[] }[] = [
  {
    label: 'Acesso',
    caps: ['access:admin'],
  },
  {
    label: 'Usuários',
    caps: ['read:users', 'manage:users'],
  },
  {
    label: 'Grupos',
    caps: ['read:groups', 'manage:groups'],
  },
  {
    label: 'Papéis',
    caps: ['read:roles', 'manage:roles'],
  },
  {
    label: 'Configurações',
    caps: ['read:configs', 'manage:configs', 'assign:configs'],
  },
  {
    label: 'Uso & Analytics',
    caps: ['read:usage'],
  },
  {
    label: 'Agentes & Prompts',
    caps: ['read:agents', 'manage:agents', 'read:prompts', 'manage:prompts'],
  },
  {
    label: 'Assistants & MCP',
    caps: ['manage:mcpservers', 'read:assistants', 'manage:assistants'],
  },
];

// Permission types and their sub-permissions (from librechat-data-provider)
export const PERMISSION_TYPES = [
  'PROMPTS',
  'AGENTS',
  'MEMORIES',
  'MCP_SERVERS',
  'REMOTE_AGENTS',
  'BOOKMARKS',
  'MULTI_CONVO',
  'TEMPORARY_CHAT',
  'RUN_CODE',
  'WEB_SEARCH',
  'FILE_SEARCH',
  'FILE_CITATIONS',
  'PEOPLE_PICKER',
  'MARKETPLACE',
] as const;

export type PermissionType = (typeof PERMISSION_TYPES)[number];

export const PERMISSION_TYPE_SCHEMA: Record<PermissionType, string[]> = {
  BOOKMARKS: ['USE'],
  PROMPTS: ['USE', 'CREATE', 'SHARE', 'SHARE_PUBLIC'],
  AGENTS: ['USE', 'CREATE', 'SHARE', 'SHARE_PUBLIC'],
  MEMORIES: ['USE', 'CREATE', 'UPDATE', 'READ', 'OPT_OUT'],
  MULTI_CONVO: ['USE'],
  TEMPORARY_CHAT: ['USE'],
  RUN_CODE: ['USE'],
  WEB_SEARCH: ['USE'],
  PEOPLE_PICKER: ['VIEW_USERS', 'VIEW_GROUPS', 'VIEW_ROLES'],
  MARKETPLACE: ['USE'],
  FILE_SEARCH: ['USE'],
  FILE_CITATIONS: ['USE'],
  MCP_SERVERS: ['USE', 'CREATE', 'SHARE', 'SHARE_PUBLIC'],
  REMOTE_AGENTS: ['USE', 'CREATE', 'SHARE', 'SHARE_PUBLIC'],
};

export const PERMISSION_TYPE_LABELS: Record<PermissionType, string> = {
  PROMPTS: 'Prompts',
  AGENTS: 'Agentes',
  MEMORIES: 'Memórias',
  MCP_SERVERS: 'MCP Servers',
  REMOTE_AGENTS: 'Agentes Remotos (API)',
  BOOKMARKS: 'Favoritos',
  MULTI_CONVO: 'Multi-conversa',
  TEMPORARY_CHAT: 'Chat temporário',
  RUN_CODE: 'Executar código',
  WEB_SEARCH: 'Busca na web',
  FILE_SEARCH: 'Busca em arquivos',
  FILE_CITATIONS: 'Citações de arquivos',
  PEOPLE_PICKER: 'Seletor de pessoas',
  MARKETPLACE: 'Marketplace',
};

export const PERMISSION_LABELS: Record<string, string> = {
  USE: 'Usar',
  CREATE: 'Criar',
  SHARE: 'Compartilhar',
  SHARE_PUBLIC: 'Compartilhar publicamente',
  UPDATE: 'Atualizar',
  READ: 'Ler',
  OPT_OUT: 'Recusar',
  VIEW_USERS: 'Ver usuários',
  VIEW_GROUPS: 'Ver grupos',
  VIEW_ROLES: 'Ver papéis',
};

export function defaultPermissions(): Record<string, Record<string, boolean>> {
  const perms: Record<string, Record<string, boolean>> = {};
  for (const type of PERMISSION_TYPES) {
    const section: Record<string, boolean> = {};
    for (const p of PERMISSION_TYPE_SCHEMA[type]) {
      section[p] = false;
    }
    perms[type] = section;
  }
  return perms;
}

export const SYSTEM_ROLE_NAMES = ['admin', 'user'];
