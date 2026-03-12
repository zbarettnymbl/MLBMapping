import { usePipelineStore } from '@/stores/pipelineStore';
import type { NotificationNodeConfig } from '@mapforge/shared';

interface Props {
  nodeId: string;
  config: NotificationNodeConfig;
}

export function NotificationForm({ nodeId, config }: Props) {
  const updateNodeConfig = usePipelineStore(s => s.updateNodeConfig);

  const update = (partial: Partial<NotificationNodeConfig>) => {
    updateNodeConfig(nodeId, { ...config, ...partial });
  };

  const toggleChannel = (channel: 'email' | 'in_app') => {
    const channels = config.channels || [];
    const newChannels = channels.includes(channel)
      ? channels.filter(c => c !== channel)
      : [...channels, channel];
    update({ channels: newChannels });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-forge-400 mb-2">Channels</label>
        <div className="space-y-1">
          {(['email', 'in_app'] as const).map(channel => (
            <label key={channel} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={(config.channels || []).includes(channel)}
                onChange={() => toggleChannel(channel)}
                className="rounded border-forge-600 bg-forge-800 text-yellow-500 focus:ring-yellow-500"
              />
              <span className="text-sm text-forge-200">
                {channel === 'email' ? 'Email' : 'In-App'}
              </span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs text-forge-400 mb-1">Recipient Type</label>
        <select
          value={config.recipientType || 'admin'}
          onChange={(e) => update({ recipientType: e.target.value as NotificationNodeConfig['recipientType'] })}
          className="w-full px-2 py-1.5 bg-forge-800 border border-forge-600 rounded text-sm text-forge-100"
        >
          <option value="admin">Admin</option>
          <option value="assigned_users">Assigned Users</option>
          <option value="specific_users">Specific Users</option>
        </select>
      </div>
      {config.recipientType === 'specific_users' && (
        <div>
          <label className="block text-xs text-forge-400 mb-1">User IDs</label>
          <input
            type="text"
            value={(config.specificUserIds || []).join(', ')}
            onChange={(e) => update({ specificUserIds: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
            placeholder="user-id-1, user-id-2"
            className="w-full px-2 py-1.5 bg-forge-800 border border-forge-600 rounded text-sm text-forge-100"
          />
          <p className="text-[10px] text-forge-500 mt-0.5">Comma-separated user IDs</p>
        </div>
      )}
      <div>
        <label className="block text-xs text-forge-400 mb-1">Message Template</label>
        <textarea
          value={config.messageTemplate || ''}
          onChange={(e) => update({ messageTemplate: e.target.value })}
          placeholder="Pipeline {{pipelineName}} completed with {{rowCount}} rows processed."
          rows={3}
          className="w-full px-2 py-1.5 bg-forge-800 border border-forge-600 rounded text-sm text-forge-100 resize-none"
        />
      </div>
    </div>
  );
}
