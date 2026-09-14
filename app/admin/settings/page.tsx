'use client';

import { useEffect, useMemo, useState } from 'react';

type SettingsForm = {
  company_name: string;
  logo_url: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  late_after: string;
  standard_hours: number;
  half_day_hours: number;
  penalty_amount: number;
  timezone: string;
  currency: string;
  gmail_from: string;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string;
};

const initialForm: SettingsForm = {
  company_name: '',
  logo_url: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  late_after: '09:30',
  standard_hours: 9,
  half_day_hours: 9,
  penalty_amount: 0,
  timezone: 'Asia/Kolkata',
  currency: 'INR',
  gmail_from: '',
  smtp_host: 'smtp.gmail.com',
  smtp_port: 465,
  smtp_secure: true,
  smtp_user: '',
};

export default function Settings() {
  const [form, setForm] = useState<SettingsForm>(initialForm);
  const [smtpPassword, setSmtpPassword] = useState('');
  const [emails, setEmails] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingLogo,setUploadingLogo]=useState(false);
  const [logoMessage,setLogoMessage]=useState('');
  const [testing, setTesting] = useState(false);
  const [smtpPasswordConfigured, setSmtpPasswordConfigured] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((x) => {
        const value = x.data || {};
        setSmtpPasswordConfigured(Boolean(x.smtpPasswordConfigured));
        setForm((prev) => ({
          ...prev,
          ...value,
          smtp_secure:
            typeof value.smtp_secure === 'boolean' ? value.smtp_secure : prev.smtp_secure,
          smtp_port: Number(value.smtp_port ?? prev.smtp_port),
          standard_hours: Number(value.standard_hours ?? prev.standard_hours),
          half_day_hours: Number(value.half_day_hours ?? prev.half_day_hours),
          penalty_amount: Number(value.penalty_amount ?? prev.penalty_amount),
        }));
        setEmails((value.email_recipients || []).join(', '));
      });
  }, []);

  const recipientList = useMemo(
    () =>
      emails
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
    [emails]
  );

  const hasSmtpBasics = !!form.smtp_host && !!form.smtp_user && Number(form.smtp_port) > 0;
  const smtpReady = hasSmtpBasics && smtpPasswordConfigured && recipientList.length > 0;

  let smtpStatusText = 'SMTP configured';
  if (!hasSmtpBasics) {
    smtpStatusText = 'Missing SMTP host, port, or user';
  } else if (!smtpPasswordConfigured) {
    smtpStatusText = 'Missing SMTP password in Admin Settings';
  } else if (recipientList.length === 0) {
    smtpStatusText = 'Missing recipient emails';
  }

  async function save() {
    setSaving(true);
    setMessage('');

    const body = {
      ...form,
      smtp_password: smtpPassword,
      email_recipients: recipientList,
    };

    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      setMessage(response.ok ? 'Settings saved.' : data.message || 'Save failed.');
      if (response.ok) {
        window.dispatchEvent(new Event('company-brand-updated'));
        setSmtpPassword('');
        setSmtpPasswordConfigured(smtpPasswordConfigured || Boolean(smtpPassword.trim()));
      }
    } finally {
      setSaving(false);
    }
  }

  async function uploadLogo(file:File){
    setLogoMessage('');
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>2*1024*1024){setLogoMessage('Choose a PNG, JPEG or WebP image up to 2 MB.');return;}
    setUploadingLogo(true);
    try{const body=new FormData();body.append('file',file);const response=await fetch('/api/company/logo',{method:'POST',body});const data=await response.json();if(!response.ok)throw new Error(data.message);setForm(prev=>({...prev,logo_url:data.logoUrl}));setLogoMessage('Logo uploaded and saved.');window.dispatchEvent(new Event('company-brand-updated'));}
    catch(e){setLogoMessage(e instanceof Error?e.message:'Logo upload failed.');}finally{setUploadingLogo(false)}
  }

  async function testEmail() {
    setTesting(true);
    setMessage('');

    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          subject: 'SMTP test email',
          message:
            'This test confirms SMTP settings from Admin panel and env app password are working.',
        }),
      });
      const data = await response.json();
      setMessage(response.ok ? 'Test email sent.' : data.message || 'Email test failed.');
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="container">
      <h1>Company and SMTP Settings</h1>
      <p className="muted">
        Manage your company details, attendance rules and email delivery in one place.
      </p>

      <div
        className="card"
        style={{
          marginBottom: 16,
          borderColor: smtpReady ? '#10b981' : '#f59e0b',
          background: smtpReady ? '#ecfdf5' : '#fffbeb',
        }}
      >
        <b>{smtpReady ? 'SMTP Status: Configured' : 'SMTP Status: Setup Required'}</b>
        <p style={{ marginTop: 6 }}>{smtpStatusText}</p>
      </div>

      <div className="card formGrid">
        <h2 style={{ marginBottom: 8 }}>Company</h2>

        <label>
          Company name
          <input
            className="input"
            value={form.company_name}
            onChange={(e) => setForm({ ...form, company_name: e.target.value })}
          />
        </label>

        <div className="full logoUploadPanel"><div className="logoPreview">{form.logo_url?<img src={form.logo_url} alt="Company logo preview"/>:<span>Logo</span>}</div><div><h3>Company logo</h3><p className="muted">PNG, JPEG or WebP · Up to 2 MB. Shown in your employee portal and admin workspace.</p><label className="btn">{uploadingLogo?'Uploading…':'Upload company logo'}<input className="logoFileInput" type="file" aria-label="Upload company logo" accept="image/png,image/jpeg,image/webp" disabled={uploadingLogo||saving} onChange={e=>{const file=e.target.files?.[0];if(file)void uploadLogo(file);e.target.value=''}}/></label>{logoMessage&&<p role="status">{logoMessage}</p>}</div></div>

        <label>
          Address
          <input
            className="input"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </label>

        <label>
          Phone
          <input
            className="input"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </label>

        <label>
          Email
          <input
            className="input"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>

        <label>
          Website
          <input
            className="input"
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
          />
        </label>

        <label>
          Late after
          <input
            className="input"
            value={form.late_after}
            onChange={(e) => setForm({ ...form, late_after: e.target.value })}
          />
        </label>

        <label>
          Standard hours
          <input
            className="input"
            type="number"
            value={form.standard_hours}
            onChange={(e) => setForm({ ...form, standard_hours: Number(e.target.value || 0) })}
          />
        </label>

        <label>
          Half day hours
          <input
            className="input"
            type="number"
            value={form.half_day_hours}
            onChange={(e) => setForm({ ...form, half_day_hours: Number(e.target.value || 0) })}
          />
        </label>

        <label>
          Penalty amount
          <input
            className="input"
            type="number"
            value={form.penalty_amount}
            onChange={(e) => setForm({ ...form, penalty_amount: Number(e.target.value || 0) })}
          />
        </label>

        <label>
          Currency
          <input
            className="input"
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
          />
        </label>

        <label>
          Timezone
          <input
            className="input"
            value={form.timezone}
            onChange={(e) => setForm({ ...form, timezone: e.target.value })}
          />
        </label>

        <h2 style={{ marginBottom: 8, marginTop: 10 }}>SMTP (Admin)</h2>

        <label>
          SMTP host
          <input
            className="input"
            value={form.smtp_host}
            onChange={(e) => setForm({ ...form, smtp_host: e.target.value })}
            placeholder="smtp.gmail.com"
          />
        </label>

        <label>
          SMTP port
          <input
            className="input"
            type="number"
            value={form.smtp_port}
            onChange={(e) => setForm({ ...form, smtp_port: Number(e.target.value || 0) })}
            placeholder="465"
          />
        </label>

        <label>
          SMTP user (Gmail)
          <input
            className="input"
            value={form.smtp_user}
            onChange={(e) => setForm({ ...form, smtp_user: e.target.value })}
            placeholder="hr@yourcompany.com"
          />
        </label>

        <label>
          SMTP password
          <input
            className="input"
            type="password"
            value={smtpPassword}
            onChange={(e) => setSmtpPassword(e.target.value)}
            placeholder="Enter app password"
          />
        </label>

        <label>
          From email
          <input
            className="input"
            value={form.gmail_from}
            onChange={(e) => setForm({ ...form, gmail_from: e.target.value })}
            placeholder="Attendance <hr@yourcompany.com>"
          />
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={form.smtp_secure}
            onChange={(e) => setForm({ ...form, smtp_secure: e.target.checked })}
          />
          Use secure SMTP (SSL/TLS)
        </label>

        <label>
          Recipient emails
          <textarea
            className="input"
            rows={5}
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            placeholder="hr@company.com, manager@company.com"
          />
        </label>

        <p className="muted">
          For Gmail keep SMTP host as smtp.gmail.com, port 465 and secure enabled. Store the
          Gmail App Password here in SMTP password.
        </p>

        <div className="inline">
          <button className="btn primary" onClick={save} disabled={saving||uploadingLogo}>
            {saving ? 'Saving...' : 'Save settings'}
          </button>
          <button className="btn" onClick={testEmail} disabled={testing}>
            {testing ? 'Testing...' : 'Send test email'}
          </button>
        </div>

        {message && <p>{message}</p>}
      </div>
    </div>
  );
}
