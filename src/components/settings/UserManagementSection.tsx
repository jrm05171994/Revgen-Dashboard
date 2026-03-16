// src/components/settings/UserManagementSection.tsx
"use client";

import { useState } from "react";

type UserRow = {
  id: string;
  name: string | null;
  email: string;
  role: "FINANCE" | "LEADERSHIP" | "REVGEN" | "OTHER";
  createdAt: string;
};

type InviteRow = {
  id: string;
  email: string;
  role: "FINANCE" | "LEADERSHIP" | "REVGEN" | "OTHER";
  invitedBy: string;
  createdAt: string;
  usedAt: string | null;
};

type Props = {
  currentUserId: string;
  initialUsers: UserRow[];
  initialInvites: InviteRow[];
  children?: React.ReactNode;
};

const ROLE_LABELS: Record<string, string> = {
  FINANCE: "Finance",
  LEADERSHIP: "Leadership",
  REVGEN: "RevGen",
  OTHER: "Other",
};

const ROLE_COLORS: Record<string, string> = {
  FINANCE:    "bg-navy/10 text-navy",
  LEADERSHIP: "bg-purple-100 text-purple-700",
  REVGEN:     "bg-teal/10 text-teal",
  OTHER:      "bg-gray-100 text-gray-600",
};

export function UserManagementSection({ currentUserId, initialUsers, initialInvites, children }: Props) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [invites, setInvites] = useState<InviteRow[]>(initialInvites);
  const [saving, setSaving] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"FINANCE" | "LEADERSHIP" | "REVGEN" | "OTHER">("REVGEN");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);

  async function handleRoleChange(userId: string, newRole: string) {
    setSaving(userId);
    setRoleError(null);
    try {
      const res = await fetch(`/api/settings/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update role");
      setUsers((prev) => prev.map((u) => (u.id === userId ? json.user : u)));
    } catch (e) {
      setRoleError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(null);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteMsg(null);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.formErrors?.[0] ?? json.error ?? "Failed");
      setInviteMsg(`Invite sent to ${inviteEmail}`);
      setInviteEmail("");
      const invRes = await fetch("/api/invites");
      const invJson = await invRes.json();
      setInvites(invJson.invites);
    } catch (e) {
      setInviteMsg(`Error: ${e instanceof Error ? e.message : "Failed"}`);
    } finally {
      setInviting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Team Members
        </h2>
        {roleError && <p className="text-xs text-red-500 mb-3">{roleError}</p>}
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-gray-500 font-semibold uppercase tracking-wide">
              <th className="pb-2 pr-6">Name</th>
              <th className="pb-2 pr-6">Email</th>
              <th className="pb-2 pr-6">Role</th>
              <th className="pb-2">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b last:border-0">
                <td className="py-3 pr-6 font-medium text-navy">
                  {user.name ?? "—"}
                  {user.id === currentUserId && (
                    <span className="ml-2 text-[10px] text-gray-400">(you)</span>
                  )}
                </td>
                <td className="py-3 pr-6 text-gray-500">{user.email}</td>
                <td className="py-3 pr-6">
                  {user.id === currentUserId ? (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.role]}`}>
                      {ROLE_LABELS[user.role]}
                    </span>
                  ) : (
                    <select
                      value={user.role}
                      disabled={!!saving}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-navy font-medium focus:outline-none focus:ring-2 focus:ring-teal/40 disabled:opacity-50"
                    >
                      <option value="FINANCE">Finance</option>
                      <option value="LEADERSHIP">Leadership</option>
                      <option value="REVGEN">RevGen</option>
                      <option value="OTHER">Other</option>
                    </select>
                  )}
                  {saving === user.id && (
                    <span className="ml-2 text-[10px] text-gray-400">Saving…</span>
                  )}
                </td>
                <td className="py-3 text-xs text-gray-400">
                  {new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Invite New User
        </h2>
        <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[9.5px] font-semibold text-gray-400 uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@kodahealthcare.com"
              className="w-64 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/40 text-navy"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9.5px] font-semibold text-gray-400 uppercase tracking-wide">
              Role
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as typeof inviteRole)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-navy font-medium focus:outline-none focus:ring-2 focus:ring-teal/40"
            >
              <option value="REVGEN">RevGen</option>
              <option value="LEADERSHIP">Leadership</option>
              <option value="FINANCE">Finance</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={inviting}
            className="px-4 py-1.5 bg-navy text-white text-sm font-semibold rounded-lg hover:bg-navy/90 disabled:opacity-40 transition-colors"
          >
            {inviting ? "Sending…" : "Send Invite"}
          </button>
        </form>
        {inviteMsg && (
          <p className={`mt-3 text-xs font-medium ${inviteMsg.startsWith("Error") ? "text-red-500" : "text-emerald-600"}`}>
            {inviteMsg}
          </p>
        )}
      </div>

      {invites.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Pending Invites
          </h2>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-gray-500 font-semibold uppercase tracking-wide">
                <th className="pb-2 pr-6">Email</th>
                <th className="pb-2 pr-6">Role</th>
                <th className="pb-2 pr-6">Invited By</th>
                <th className="pb-2 pr-6">Status</th>
                <th className="pb-2">Sent</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((inv) => (
                <tr key={inv.id} className="border-b last:border-0">
                  <td className="py-3 pr-6 text-navy font-medium">{inv.email}</td>
                  <td className="py-3 pr-6">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[inv.role]}`}>
                      {ROLE_LABELS[inv.role]}
                    </span>
                  </td>
                  <td className="py-3 pr-6 text-xs text-gray-500">{inv.invitedBy}</td>
                  <td className="py-3 pr-6">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${inv.usedAt ? "bg-emerald-100 text-emerald-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {inv.usedAt ? "Accepted" : "Pending"}
                    </span>
                  </td>
                  <td className="py-3 text-xs text-gray-400">
                    {new Date(inv.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {children}
    </div>
  );
}
