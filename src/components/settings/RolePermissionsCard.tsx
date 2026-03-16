// src/components/settings/RolePermissionsCard.tsx

const HUBS = [
  { label: "Dashboard",    finance: true,  leadership: true,  revgen: true,  other: true  },
  { label: "Pipeline",     finance: true,  leadership: true,  revgen: true,  other: true  },
  { label: "Leads",        finance: true,  leadership: true,  revgen: true,  other: true  },
  { label: "Analyzer",     finance: true,  leadership: true,  revgen: true,  other: false },
  { label: "Data Sources", finance: true,  leadership: false, revgen: false, other: false },
  { label: "Settings",     finance: true,  leadership: false, revgen: false, other: false },
];

const ROLES = [
  { key: "finance",    label: "Finance" },
  { key: "leadership", label: "Leadership" },
  { key: "revgen",     label: "RevGen" },
  { key: "other",      label: "Other" },
] as const;

export function RolePermissionsCard() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">
        Role Permissions
      </h2>
      <p className="text-xs text-gray-400 mb-5">
        Which hubs each role can access. Managed via the Team Members section above.
      </p>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-gray-500 font-semibold uppercase tracking-wide">
              <th className="pb-2 pr-8 w-40">Hub</th>
              {ROLES.map((r) => (
                <th key={r.key} className="pb-2 pr-6 text-center">{r.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HUBS.map((hub) => (
              <tr key={hub.label} className="border-b last:border-0">
                <td className="py-3 pr-8 font-medium text-navy">{hub.label}</td>
                {ROLES.map((r) => (
                  <td key={r.key} className="py-3 pr-6 text-center">
                    {hub[r.key] ? (
                      <span className="inline-block w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs leading-5">✓</span>
                    ) : (
                      <span className="inline-block w-5 h-5 rounded-full bg-gray-100 text-gray-400 text-xs leading-5">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
