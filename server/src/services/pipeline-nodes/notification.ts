import type { NotificationNodeConfig } from '@mapforge/shared';
import type { NodeExecutionContext, NodeExecutionResult } from './index';

export async function handleNotification(config: NotificationNodeConfig, context: NodeExecutionContext): Promise<NodeExecutionResult> {
  const metadata = {
    channels: config.channels,
    recipientType: config.recipientType,
    specificUserIds: config.specificUserIds,
    messageTemplate: config.messageTemplate,
    inputRowCount: context.inputData.length,
    sent: false, // TODO: implement actual sending
  };
  console.log(`[Pipeline Notification] Would send to ${config.recipientType} via ${config.channels.join(', ')}: ${config.messageTemplate}`);
  return { status: 'success', outputData: context.inputData, rowCount: context.inputData.length, metadata };
}
