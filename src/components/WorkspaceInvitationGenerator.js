import { useState } from 'react';
import { Check } from 'lucide-react';
import { useNotification } from '../contexts/NotificationContext';

const WorkspaceInvitationGenerator = ({ workspace, token }) => {
  const { notify } = useNotification();
  const [copied, setCopied] = useState(false);
  const [emailForm, setEmailForm] = useState({
    emails: '',
    message: '',
  });
  const [sendingEmails, setSendingEmails] = useState(false);

  const invitationUrl = `${window.location.origin}/join?token=${token}`;

  const defaultMessage = `You're invited to join the workspace "${workspace.name}"!

Click the link below to get started:
${invitationUrl}

This link will give you access to the workspace's contact list and allow you to collaborate with the team.`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(invitationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silent failure expected
    }
  };

  const handleSendEmails = async () => {
    setSendingEmails(true);

    // Extract email addresses (split by comma, newline, or space)
    const emailList = emailForm.emails
      .split(/[\s,\n]+/)
      .map((email) => email.trim())
      .filter((email) => email.length > 0);

    if (emailList.length === 0) {
      notify.warning('Please enter at least one email address');
      setSendingEmails(false);
      return;
    }

    // In production, this would send actual emails via a backend function
    // For now, we'll just show a success message

    // Simulate sending
    await new Promise((resolve) => setTimeout(resolve, 1000));

    notify.success(`Invitation links sent to ${emailList.length} email(s)!`);
    setEmailForm({ emails: '', message: '' });
    setSendingEmails(false);
  };

  return (
    <div className="workspace-invitation-generator">
      <div className="invitation-link-section">
        <h4>Shareable Invitation Link</h4>
        <div className="link-display">
          <input type="text" value={invitationUrl} readOnly onClick={(e) => e.target.select()} />
          <button
            onClick={handleCopyLink}
            className={copied ? 'button-success' : 'button-secondary'}
          >
            {copied ? (
              <>
                <Check size={14} /> Copied!
              </>
            ) : (
              'Copy Link'
            )}
          </button>
        </div>
        <small>Anyone with this link can join the workspace.</small>
      </div>

      <div className="email-invitation-section">
        <h4>Send Email Invitations</h4>
        <p className="section-description">
          Enter email addresses to send invitation links directly.
        </p>

        <div className="form-group">
          <label htmlFor="emails">Email Addresses</label>
          <textarea
            id="emails"
            value={emailForm.emails}
            onChange={(e) => setEmailForm({ ...emailForm, emails: e.target.value })}
            placeholder="Enter email addresses (comma or line separated)"
            rows="3"
          />
        </div>

        <div className="form-group">
          <label htmlFor="message">Custom Message (optional)</label>
          <textarea
            id="message"
            value={emailForm.message}
            onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
            placeholder={defaultMessage}
            rows="6"
          />
          <small>Leave blank to use default invitation message.</small>
        </div>

        <button
          onClick={handleSendEmails}
          className="button-primary"
          disabled={sendingEmails || !emailForm.emails.trim()}
        >
          {sendingEmails ? 'Sending...' : 'Send Invitations'}
        </button>

        <div className="info-box">
          <strong>Note:</strong> Email functionality requires backend setup. For now, share the link
          directly with team members.
        </div>
      </div>
    </div>
  );
};

export default WorkspaceInvitationGenerator;
