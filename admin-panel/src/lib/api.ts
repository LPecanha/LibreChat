import { getToken, clearAuth, isTokenExpired } from './auth';
import { getActiveTenant } from './tenant';

const EXT_URL = (import.meta.env.VITE_EXT_URL as string | undefined) ?? '';

function extUrl() { return EXT_URL; }
function librechatUrl() { return getActiveTenant()?.librechatUrl ?? ''; }

type RequestOptions = Omit<RequestInit, 'headers'> & { headers?: Record<string, string> };

function handleSessionExpired(): never {
  clearAuth();
  window.location.href = '/login';
  throw new Error('Session expired');
}

async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  if (isTokenExpired()) handleSessionExpired();
  const token = getToken();
  const tenant = getActiveTenant();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(tenant ? { 'X-Tenant-ID': tenant.id } : {}),
    ...options.headers,
  };

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    handleSessionExpired();
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as Record<string, string>).error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginResponse {
  token: string;
  refreshToken?: string;
  user: { id: string; email: string; name: string; avatar?: string; role: string };
}

export async function loginWithPassword(email: string, password: string): Promise<LoginResponse> {
  const tenant = getActiveTenant();
  const res = await fetch(`${extUrl()}/ext/admin/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(tenant ? { 'X-Tenant-ID': tenant.id } : {}),
    },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, string>;
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<LoginResponse>;
}

// ── Usage ─────────────────────────────────────────────────────────────────────

export interface UsageSummary {
  totalTokenValue: number;
  totalTransactions: number;
  uniqueActiveUsers: number;
  totalCreditsRemaining: number;
}

export interface UsagePoint {
  year: number;
  month?: number;
  day?: number;
  week?: number;
  tokenValue: number;
  transactions: number;
  users: number;
}

export interface UserUsage {
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  tokenValue: number;
  transactions: number;
}

export interface ModelUsage {
  model: string;
  tokenValue: number;
  transactions: number;
}

export interface GroupUsage {
  groupId: string;
  groupName: string;
  tokenValue: number;
  transactions: number;
  uniqueUsers: number;
}

export function fetchUsageSummary(params?: { from?: string; to?: string }) {
  const q = new URLSearchParams(params as Record<string, string>).toString();
  return request<UsageSummary>(`${extUrl()}/ext/admin/usage/summary${q ? `?${q}` : ''}`);
}

export function fetchUsageOverTime(params?: { period?: string; days?: string; from?: string; to?: string }) {
  const q = new URLSearchParams(params as Record<string, string>).toString();
  return request<UsagePoint[]>(`${extUrl()}/ext/admin/usage/over-time${q ? `?${q}` : ''}`);
}

export function fetchUsageByUser(params?: { limit?: string; from?: string; to?: string }) {
  const q = new URLSearchParams(params as Record<string, string>).toString();
  return request<UserUsage[]>(`${extUrl()}/ext/admin/usage/by-user${q ? `?${q}` : ''}`);
}

export function fetchUsageByModel(params?: { from?: string; to?: string }) {
  const q = new URLSearchParams(params as Record<string, string>).toString();
  return request<ModelUsage[]>(`${extUrl()}/ext/admin/usage/by-model${q ? `?${q}` : ''}`);
}

export interface UserUsageDetail {
  total: { tokenValue: number; transactions: number };
  byModel: ModelUsage[];
}

export function fetchUserUsageDetail(userId: string, days?: string) {
  const q = days ? `?days=${days}` : '';
  return request<UserUsageDetail>(`${extUrl()}/ext/admin/usage/user/${encodeURIComponent(userId)}${q}`);
}

export function fetchUsageByGroup(params?: { from?: string; to?: string }) {
  const q = new URLSearchParams(params as Record<string, string>).toString();
  return request<GroupUsage[]>(`${extUrl()}/ext/admin/usage/by-group${q ? `?${q}` : ''}`);
}

export interface AgentUsage {
  agentId: string;
  name: string;
  model?: string;
  tokenValue: number;
  transactions: number;
  conversationCount: number;
  uniqueUsers: number;
}

export interface ConversationUsage {
  conversationId: string;
  title: string;
  model?: string;
  agentId?: string;
  userName: string;
  userEmail: string;
  tokenValue: number;
  transactions: number;
}

export interface UserUsageDetailV2 {
  total: { tokenValue: number; transactions: number };
  byModel: ModelUsage[];
  byConversation: {
    conversationId: string;
    title: string;
    model?: string;
    agentId?: string;
    tokenValue: number;
    transactions: number;
  }[];
}

export interface GroupUsageDetail {
  groupId: string;
  groupName: string;
  memberCount: number;
  total: { tokenValue: number; transactions: number };
  overTime: { year: number; month: number; day: number; tokenValue: number; transactions: number }[];
  byMember: { userId: string; name: string; email: string; avatar?: string; tokenValue: number; transactions: number }[];
  byModel: ModelUsage[];
}

export function fetchUsageByAgent(params?: { limit?: string; from?: string; to?: string }) {
  const q = new URLSearchParams(params as Record<string, string>).toString();
  return request<AgentUsage[]>(`${extUrl()}/ext/admin/usage/by-agent${q ? `?${q}` : ''}`);
}

export function fetchUsageByConversation(params?: { limit?: string; from?: string; to?: string }) {
  const q = new URLSearchParams(params as Record<string, string>).toString();
  return request<ConversationUsage[]>(`${extUrl()}/ext/admin/usage/by-conversation${q ? `?${q}` : ''}`);
}

export function fetchUserUsageDetailV2(userId: string, days?: string) {
  const q = days ? `?days=${days}` : '';
  return request<UserUsageDetailV2>(`${extUrl()}/ext/admin/usage/user/${encodeURIComponent(userId)}${q}`);
}

export function fetchGroupUsageDetail(groupId: string, days?: string) {
  const q = days ? `?days=${days}` : '';
  return request<GroupUsageDetail>(`${extUrl()}/ext/admin/usage/group/${encodeURIComponent(groupId)}${q}`);
}

// ── Revenue ────────────────────────────────────────────────────────────────────

export interface RevenueSummary {
  allTime: { totalAmount: number; totalTransactions: number; totalCreditsGranted: number };
  last30Days: { totalAmount: number; totalTransactions: number };
  subscriptions: {
    active: number;
    paused: number;
    cancelled: number;
    pastDue: number;
    activeCreditsPerCycle: number;
  };
  byProvider: { provider: string; totalAmount: number; completedCount: number; failedCount: number; failureRate: number }[];
}

export interface RevenuePoint {
  year: number;
  month?: number;
  day?: number;
  week?: number;
  totalAmount: number;
  totalCreditsGranted: number;
  transactionCount: number;
}

export function fetchRevenueSummary() {
  return request<RevenueSummary>(`${extUrl()}/ext/admin/revenue/summary`);
}

export function fetchRevenueOverTime(params?: { period?: string; days?: string; from?: string; to?: string }) {
  const q = new URLSearchParams(params as Record<string, string>).toString();
  return request<RevenuePoint[]>(`${extUrl()}/ext/admin/revenue/over-time${q ? `?${q}` : ''}`);
}

// ── Users ────────────────────────────────────────────────────────────────────

export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  username: string;
  avatar: string;
  role: string;
  provider: string;
  createdAt: string;
}

export interface UsersResponse {
  users: AdminUserItem[];
  total: number;
  limit: number;
  offset: number;
}

export function fetchUsers(params?: { limit?: number; offset?: number }) {
  const q = new URLSearchParams(params as Record<string, string>).toString();
  return request<UsersResponse>(`${librechatUrl()}/api/admin/users${q ? `?${q}` : ''}`);
}

export function searchUsers(q: string) {
  return request<{ users: AdminUserItem[] }>(`${librechatUrl()}/api/admin/users/search?q=${encodeURIComponent(q)}`);
}

export function createUser(data: { name: string; email: string; password: string; role?: string }) {
  return request<AdminUserItem>(`${extUrl()}/ext/admin/users`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateUser(id: string, data: { name?: string; email?: string; role?: string }) {
  return request<AdminUserItem>(`${extUrl()}/ext/admin/users/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteUser(id: string) {
  return request(`${extUrl()}/ext/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ── Organizations ────────────────────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  description?: string;
  email?: string;
  memberCount: number;
  type: 'company' | 'team';
  creditPoolEnabled: boolean;
  creditLimitPerUser?: number;
  billingEmail?: string;
  poolCredits: number;
  totalPurchased: number;
  createdAt: string;
}

export interface OrganizationsResponse {
  organizations: Organization[];
  total: number;
}

export function fetchOrganizations() {
  return request<OrganizationsResponse>(`${extUrl()}/ext/admin/organizations`);
}

export function fetchOrganization(id: string) {
  return request<Organization & { memberIds: string[]; totalDistributed: number; taxId?: string }>(
    `${extUrl()}/ext/admin/organizations/${id}`,
  );
}

export function createOrganization(data: { name: string; description?: string; email?: string; type?: 'company' | 'team' }) {
  return request<Organization>(`${extUrl()}/ext/admin/organizations`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateOrganization(id: string, data: { name?: string; description?: string; email?: string }) {
  return request<Pick<Organization, 'id' | 'name' | 'description' | 'email'>>(`${extUrl()}/ext/admin/organizations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteOrganization(id: string) {
  return request(`${extUrl()}/ext/admin/organizations/${id}`, { method: 'DELETE' });
}

export function addOrgMember(orgId: string, userId: string) {
  return request(`${extUrl()}/ext/admin/organizations/${orgId}/members`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export function removeOrgMember(orgId: string, userId: string) {
  return request(`${extUrl()}/ext/admin/organizations/${orgId}/members/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
}

export function updateOrgProfile(
  id: string,
  data: {
    type?: 'company' | 'team';
    billingEmail?: string;
    taxId?: string;
    creditLimitPerUser?: number;
    creditPoolEnabled?: boolean;
  },
) {
  return request(`${extUrl()}/ext/admin/organizations/${id}/profile`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ── Credits ───────────────────────────────────────────────────────────────────

export interface UserBalance {
  userId: string;
  tokenCredits: number;
  autoRefillEnabled: boolean;
}

export function fetchUserBalance(userId: string) {
  return request<UserBalance>(`${extUrl()}/ext/admin/credits/user/${userId}`);
}

export function adjustUserCredits(userId: string, amount: number, reason?: string) {
  return request<UserBalance>(`${extUrl()}/ext/admin/credits/user/${userId}/adjust`, {
    method: 'POST',
    body: JSON.stringify({ amount, reason }),
  });
}

export interface OrgBalanceInfo {
  groupId: string;
  poolCredits: number;
  totalPurchased: number;
  totalDistributed: number;
}

export function fetchOrgBalance(groupId: string) {
  return request<OrgBalanceInfo>(`${extUrl()}/ext/admin/credits/org/${groupId}`);
}

export function adjustOrgCredits(groupId: string, amount: number, reason?: string) {
  return request(`${extUrl()}/ext/admin/credits/org/${groupId}/adjust`, {
    method: 'POST',
    body: JSON.stringify({ amount, reason }),
  });
}

export function distributeCredits(groupId: string, userId: string, amount: number, period: string) {
  return request(`${extUrl()}/ext/admin/credits/org/${groupId}/distribute`, {
    method: 'POST',
    body: JSON.stringify({ userId, amount, period }),
  });
}

export interface CreditAuditEntry {
  _id: string;
  entityType: 'user' | 'group';
  entityId: string;
  adminId: string;
  amount: number;
  reason: string;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: string;
}

export interface CreditAuditResponse {
  entries: CreditAuditEntry[];
  total: number;
  limit: number;
  offset: number;
}

export function fetchCreditAudit(params?: {
  entityId?: string;
  entityType?: string;
  limit?: string;
  offset?: string;
}) {
  const q = new URLSearchParams(params as Record<string, string>).toString();
  return request<CreditAuditResponse>(`${extUrl()}/ext/admin/credits/audit${q ? `?${q}` : ''}`);
}

// ── Subscriptions ─────────────────────────────────────────────────────────────

export interface Subscription {
  _id: string;
  entityType: 'user' | 'group';
  entityId: string;
  plan: string;
  creditsPerCycle: number;
  cycleIntervalDays: number;
  status: 'active' | 'paused' | 'cancelled' | 'past_due';
  paymentProvider: 'stripe' | 'pagarme' | 'manual';
  externalSubId?: string;
  nextRefillAt: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelledAt?: string;
  createdAt: string;
}

export interface SubscriptionsResponse {
  subscriptions: Subscription[];
  total: number;
  limit: number;
  offset: number;
}

export function fetchSubscriptions(params?: {
  entityType?: string;
  entityId?: string;
  status?: string;
  limit?: string;
  offset?: string;
}) {
  const q = new URLSearchParams(params as Record<string, string>).toString();
  return request<SubscriptionsResponse>(`${extUrl()}/ext/admin/subscriptions${q ? `?${q}` : ''}`);
}

export function createSubscription(data: {
  entityType: 'user' | 'group';
  entityId: string;
  plan: string;
  creditsPerCycle: number;
  cycleIntervalDays?: number;
  paymentProvider?: 'stripe' | 'pagarme' | 'manual';
}) {
  return request<Subscription>(`${extUrl()}/ext/admin/subscriptions`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateSubscription(id: string, data: { status?: string; creditsPerCycle?: number }) {
  return request<Subscription>(`${extUrl()}/ext/admin/subscriptions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function cancelSubscription(id: string) {
  return request(`${extUrl()}/ext/admin/subscriptions/${id}`, { method: 'DELETE' });
}

// ── Payment ────────────────────────────────────────────────────────────────────

export interface CreditPlan {
  id: string;
  name: string;
  credits: number;
  pricesBRL: number;
  pricesUSD: number;
  popular?: boolean;
}

export interface PaymentTransaction {
  _id: string;
  entityType: 'user' | 'group';
  entityId: string;
  amount: number;
  currency: string;
  provider: 'stripe' | 'pagarme' | 'manual';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  creditsGranted: number;
  idempotencyKey: string;
  externalTxnId?: string;
  createdAt: string;
}

export interface PaymentHistoryResponse {
  transactions: PaymentTransaction[];
  total: number;
  limit: number;
  offset: number;
}

export function fetchCreditPlans() {
  return request<CreditPlan[]>(`${extUrl()}/ext/payment/plans`);
}

export function createStripeCheckout(data: {
  planId: string;
  entityType?: 'user' | 'group';
  entityId?: string;
  successUrl: string;
  cancelUrl: string;
}) {
  return request<{ url: string; sessionId: string }>(`${extUrl()}/ext/payment/stripe/checkout`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function createPixCheckout(data: {
  planId: string;
  entityType?: 'user' | 'group';
  entityId?: string;
  customerName: string;
  customerEmail: string;
  customerDocument: string;
}) {
  return request<{ orderId: string; qrCode: string; qrCodeUrl: string; expiresAt: string }>(
    `${extUrl()}/ext/payment/pagarme/checkout/pix`,
    { method: 'POST', body: JSON.stringify(data) },
  );
}

export function fetchPaymentHistory(params?: { entityId?: string; limit?: string; offset?: string }) {
  const q = new URLSearchParams(params as Record<string, string>).toString();
  return request<PaymentHistoryResponse>(`${extUrl()}/ext/payment/stripe/history${q ? `?${q}` : ''}`);
}

// ── Agents ────────────────────────────────────────────────────────────────────

export interface AclEntry {
  _id: string;
  principalType: 'user' | 'group';
  principalId: string;
  principalName?: string;
  permBits: number;
  grantedAt: string;
}

export interface AgentItem {
  _id: string;
  id: string;
  name: string;
  description?: string;
  model: string;
  author: string;
  authorName?: string;
  access_level?: number;
  createdAt?: string;
  acl: AclEntry[];
}

export function fetchAgents() {
  return request<AgentItem[]>(`${extUrl()}/ext/admin/agents`);
}

export function grantAgentAccess(agentId: string, data: { principalType: 'user' | 'group'; principalId: string; permBits?: number }) {
  return request(`${extUrl()}/ext/admin/agents/${encodeURIComponent(agentId)}/acl`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function revokeAgentAccess(agentId: string, aclId: string) {
  return request(`${extUrl()}/ext/admin/agents/${encodeURIComponent(agentId)}/acl/${aclId}`, { method: 'DELETE' });
}

export function updateAgent(agentId: string, data: { name?: string; description?: string; access_level?: number }) {
  return request(`${extUrl()}/ext/admin/agents/${encodeURIComponent(agentId)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteAgent(agentId: string) {
  return request(`${extUrl()}/ext/admin/agents/${encodeURIComponent(agentId)}`, { method: 'DELETE' });
}

// ── Plans ─────────────────────────────────────────────────────────────────────

export interface AdminCreditPlan {
  id: string;
  planId: string;
  name: string;
  type?: 'subscription' | 'one_time';
  credits: number;
  pricesBRL: number;
  pricesUSD: number;
  popular: boolean;
  active: boolean;
  discountPct?: number;
}

export function fetchAdminPlans() {
  return request<AdminCreditPlan[]>(`${extUrl()}/ext/admin/plans`);
}

export function createAdminPlan(data: {
  planId: string; name: string; type?: 'subscription' | 'one_time';
  credits: number; pricesBRL: number; pricesUSD: number; popular?: boolean; discountPct?: number;
}) {
  return request<AdminCreditPlan>(`${extUrl()}/ext/admin/plans`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateAdminPlan(id: string, data: {
  name?: string; credits?: number; pricesBRL?: number; pricesUSD?: number;
  popular?: boolean; active?: boolean; discountPct?: number;
}) {
  return request<AdminCreditPlan>(`${extUrl()}/ext/admin/plans/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteAdminPlan(id: string) {
  return request(`${extUrl()}/ext/admin/plans/${id}`, { method: 'DELETE' });
}

// ── Groups ────────────────────────────────────────────────────────────────────

export interface AdminGroup {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  topMembers?: { userId: string; name?: string; email?: string }[];
}

export interface GroupsResponse {
  groups: AdminGroup[];
  total: number;
}

export interface GroupMember {
  userId: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
}

export function fetchGroups(params?: { search?: string; limit?: number; offset?: number }) {
  const q = new URLSearchParams(params as Record<string, string>).toString();
  return request<GroupsResponse>(`${librechatUrl()}/api/admin/groups${q ? `?${q}` : ''}`);
}

export function createGroup(data: { name: string; description?: string }) {
  return request<{ group: AdminGroup }>(`${librechatUrl()}/api/admin/groups`, {
    method: 'POST',
    body: JSON.stringify({ ...data, source: 'local' }),
  });
}

export function updateGroup(id: string, data: { name?: string; description?: string }) {
  return request<{ group: AdminGroup }>(`${librechatUrl()}/api/admin/groups/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteGroup(id: string) {
  return request(`${librechatUrl()}/api/admin/groups/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function fetchGroupMembers(id: string, params?: { limit?: number; offset?: number }) {
  const q = new URLSearchParams(params as Record<string, string>).toString();
  return request<{ members: GroupMember[]; total: number }>(`${librechatUrl()}/api/admin/groups/${encodeURIComponent(id)}/members${q ? `?${q}` : ''}`);
}

export function addGroupMember(groupId: string, userId: string) {
  return request(`${librechatUrl()}/api/admin/groups/${encodeURIComponent(groupId)}/members`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export function removeGroupMember(groupId: string, userId: string) {
  return request(`${librechatUrl()}/api/admin/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}`, { method: 'DELETE' });
}

// ── Roles ─────────────────────────────────────────────────────────────────────

export interface AdminRole {
  id: string;
  name: string;
  description?: string;
  isSystemRole?: boolean;
  userCount?: number;
  permissions?: Record<string, Record<string, boolean>>;
}

export interface RolesResponse {
  roles: AdminRole[];
  total: number;
}

export function fetchRoles(params?: { limit?: number; offset?: number }) {
  const q = new URLSearchParams(params as Record<string, string>).toString();
  return request<RolesResponse>(`${librechatUrl()}/api/admin/roles${q ? `?${q}` : ''}`);
}

export function fetchRole(name: string) {
  return request<{ role: AdminRole }>(`${librechatUrl()}/api/admin/roles/${encodeURIComponent(name)}`);
}

export function createRole(data: { name: string; description?: string }) {
  return request<{ role: AdminRole }>(`${librechatUrl()}/api/admin/roles`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateRole(name: string, data: { name?: string; description?: string }) {
  return request<{ role: AdminRole }>(`${librechatUrl()}/api/admin/roles/${encodeURIComponent(name)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function updateRolePermissions(name: string, permissions: Record<string, Record<string, boolean>>) {
  return request<{ role: AdminRole }>(`${librechatUrl()}/api/admin/roles/${encodeURIComponent(name)}/permissions`, {
    method: 'PATCH',
    body: JSON.stringify({ permissions }),
  });
}

export function deleteRole(name: string) {
  return request(`${librechatUrl()}/api/admin/roles/${encodeURIComponent(name)}`, { method: 'DELETE' });
}

export function fetchRoleMembers(name: string, params?: { limit?: number; offset?: number }) {
  const q = new URLSearchParams(params as Record<string, string>).toString();
  return request<{ members: GroupMember[]; total: number }>(`${librechatUrl()}/api/admin/roles/${encodeURIComponent(name)}/members${q ? `?${q}` : ''}`);
}

export function addRoleMember(roleName: string, userId: string) {
  return request(`${librechatUrl()}/api/admin/roles/${encodeURIComponent(roleName)}/members`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export function removeRoleMember(roleName: string, userId: string) {
  return request(`${librechatUrl()}/api/admin/roles/${encodeURIComponent(roleName)}/members/${encodeURIComponent(userId)}`, { method: 'DELETE' });
}

// ── System Grants ─────────────────────────────────────────────────────────────

export interface SystemGrant {
  id: string;
  principalType: 'user' | 'role' | 'group';
  principalId: string;
  capability: string;
  grantedAt?: string;
}

export function fetchAllGrants() {
  return request<{ grants: SystemGrant[] }>(`${librechatUrl()}/api/admin/grants`);
}

export function fetchPrincipalGrants(principalType: string, principalId: string) {
  return request<{ grants: SystemGrant[] }>(`${librechatUrl()}/api/admin/grants/${encodeURIComponent(principalType)}/${encodeURIComponent(principalId)}`);
}

export function createGrant(data: { principalType: string; principalId: string; capability: string }) {
  return request<{ grant: SystemGrant }>(`${librechatUrl()}/api/admin/grants`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function revokeGrant(principalType: string, principalId: string, capability: string) {
  return request(`${librechatUrl()}/api/admin/grants/${encodeURIComponent(principalType)}/${encodeURIComponent(principalId)}/${encodeURIComponent(capability)}`, { method: 'DELETE' });
}

// ── Configuration ─────────────────────────────────────────────────────────────

export interface ConfigScope {
  _id?: string;
  principalType: string;
  principalId: string;
  overrides: Record<string, unknown>;
  priority: number;
  isActive?: boolean;
}

export function fetchBaseConfig() {
  return request<{ config: Record<string, unknown> }>(`${librechatUrl()}/api/admin/config/base`);
}

export function fetchAllConfigs() {
  return request<{ configs: ConfigScope[] }>(`${librechatUrl()}/api/admin/config`);
}

export function fetchScopeConfig(principalType: string, principalId: string) {
  return request<{ config: ConfigScope }>(`${librechatUrl()}/api/admin/config/${encodeURIComponent(principalType)}/${encodeURIComponent(principalId)}`);
}

export function saveBaseConfigFields(entries: { fieldPath: string; value: unknown }[]) {
  return request(`${librechatUrl()}/api/admin/config/role/librechat_base/fields`, {
    method: 'PATCH',
    body: JSON.stringify({ entries }),
  });
}

export function upsertScopeConfig(principalType: string, principalId: string, data: { overrides: Record<string, unknown>; priority: number }) {
  return request<{ config: ConfigScope }>(`${librechatUrl()}/api/admin/config/${encodeURIComponent(principalType)}/${encodeURIComponent(principalId)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function patchScopeConfigFields(principalType: string, principalId: string, entries: { fieldPath: string; value: unknown }[]) {
  return request(`${librechatUrl()}/api/admin/config/${encodeURIComponent(principalType)}/${encodeURIComponent(principalId)}/fields`, {
    method: 'PATCH',
    body: JSON.stringify({ entries }),
  });
}

export function deleteScopeConfig(principalType: string, principalId: string) {
  return request(`${librechatUrl()}/api/admin/config/${encodeURIComponent(principalType)}/${encodeURIComponent(principalId)}`, { method: 'DELETE' });
}

export function toggleScopeActive(principalType: string, principalId: string, isActive: boolean) {
  return request(`${librechatUrl()}/api/admin/config/${encodeURIComponent(principalType)}/${encodeURIComponent(principalId)}/active`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
}
