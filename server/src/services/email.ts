export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    console.log(`[Email] To: ${message.to}`);
    console.log(`[Email] Subject: ${message.subject}`);
    console.log(`[Email] Body: ${message.body}`);
    console.log('---');
  }
}

function getProvider(): EmailProvider {
  const provider = process.env.EMAIL_PROVIDER || 'console';

  switch (provider) {
    case 'console':
      return new ConsoleEmailProvider();
    case 'ses':
      // TODO: implement SES provider when needed
      console.warn('[Email] SES provider not yet implemented, falling back to console');
      return new ConsoleEmailProvider();
    case 'sendgrid':
      // TODO: implement SendGrid provider not yet implemented, falling back to console');
      console.warn('[Email] SendGrid provider not yet implemented, falling back to console');
      return new ConsoleEmailProvider();
    default:
      return new ConsoleEmailProvider();
  }
}

const emailProvider = getProvider();

export async function sendEmail(message: EmailMessage): Promise<void> {
  await emailProvider.send(message);
}

export function buildAssignmentEmail(exerciseName: string, role: string, deadline: string | null): EmailMessage {
  const deadlineText = deadline ? ` Deadline: ${new Date(deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.` : '';
  return {
    to: '', // caller sets this
    subject: `You've been assigned to ${exerciseName}`,
    body: `You've been assigned to "${exerciseName}" as ${role}.${deadlineText}`,
  };
}

export function buildReminderEmail(exerciseName: string, deadline: string, unclassifiedCount: number): EmailMessage {
  return {
    to: '',
    subject: `Reminder: ${exerciseName} deadline approaching`,
    body: `Reminder: "${exerciseName}" deadline is ${new Date(deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. You have ${unclassifiedCount} unclassified records remaining.`,
  };
}

export function buildReassignmentEmail(exerciseName: string, newRole: string): EmailMessage {
  return {
    to: '',
    subject: `Assignment updated: ${exerciseName}`,
    body: `Your assignment on "${exerciseName}" has been updated. New role: ${newRole}.`,
  };
}
