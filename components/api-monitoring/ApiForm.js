'use client';

import { useState, useEffect } from 'react';

export default function ApiForm({ initialData = null, onSubmit, onCancel, isLoading }) {
  const [activeTab, setActiveTab] = useState('general');

  // Convert initial headersJson object to array [{ key, value }]
  const initialHeadersArray = () => {
    if (initialData?.headersJson && typeof initialData.headersJson === 'object') {
      return Object.entries(initialData.headersJson).map(([key, value]) => ({ key, value: String(value) }));
    }
    return [];
  };

  // Convert initial queryParamsJson object to array [{ key, value }]
  const initialQueryParamsArray = () => {
    if (initialData?.queryParamsJson && typeof initialData.queryParamsJson === 'object') {
      return Object.entries(initialData.queryParamsJson).map(([key, value]) => ({ key, value: String(value) }));
    }
    return [];
  };

  // Convert initial alertEmails to array
  const initialAlertEmailsArray = () => {
    if (Array.isArray(initialData?.alertEmails)) {
      return initialData.alertEmails.map((email) => String(email));
    }
    return [];
  };

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    url: initialData?.url || '',
    method: initialData?.method || 'GET',
    description: initialData?.description || '',
    isActive: initialData?.isActive ?? true,
    timeoutMs: initialData?.timeoutMs ?? 5000,
    responseTimeThresholdMs: initialData?.responseTimeThresholdMs ?? '',
    unhealthyThreshold: initialData?.unhealthyThreshold ?? 1,
    recoveryThreshold: initialData?.recoveryThreshold ?? 1,
  });

  const [headers, setHeaders] = useState(initialHeadersArray);
  const [queryParams, setQueryParams] = useState(initialQueryParamsArray);
  const [bodyJson, setBodyJson] = useState(initialData?.bodyJson || '');
  const [alertEmails, setAlertEmails] = useState(initialAlertEmailsArray);

  // Webhook State
  const [webhookUrl, setWebhookUrl] = useState(initialData?.webhookUrl || '');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [webhookSecretConfigured, setWebhookSecretConfigured] = useState(
    Boolean(initialData?.webhookSecretConfigured)
  );
  const [clearWebhookSecret, setClearWebhookSecret] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState(null);

  const [formError, setFormError] = useState('');
  const [urlError, setUrlError] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Validate URL
  const validateUrlFormat = (urlValue) => {
    if (!urlValue.trim()) {
      return "L'URL de l'API est requise";
    }
    try {
      const parsed = new URL(urlValue);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return "L'URL doit commencer par http:// ou https://";
      }
      return '';
    } catch (_) {
      return 'Veuillez saisir une URL valide (ex: https://api.example.com/users)';
    }
  };

  // Validate JSON string
  const validateJsonString = (str) => {
    if (!str || !str.trim()) return '';
    try {
      JSON.parse(str);
      return '';
    } catch (err) {
      return 'JSON invalide : Veuillez corriger la syntaxe (ex: {"key": "value"})';
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;

    setFormData((prev) => ({ ...prev, [name]: newValue }));
    if (formError) setFormError('');
    if (testResult) setTestResult(null);

    if (name === 'url') {
      const err = validateUrlFormat(newValue);
      setUrlError(err);
    }
  };

  // Headers Handlers
  const handleAddHeader = () => {
    setHeaders((prev) => [...prev, { key: '', value: '' }]);
  };

  const handleHeaderChange = (index, field, value) => {
    setHeaders((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleRemoveHeader = (index) => {
    setHeaders((prev) => prev.filter((_, i) => i !== index));
  };

  // Query Params Handlers
  const handleAddQueryParam = () => {
    setQueryParams((prev) => [...prev, { key: '', value: '' }]);
  };

  const handleQueryParamChange = (index, field, value) => {
    setQueryParams((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleRemoveQueryParam = (index) => {
    setQueryParams((prev) => prev.filter((_, i) => i !== index));
  };

  // Alert Emails Handlers
  const handleAddAlertEmail = () => {
    setAlertEmails((prev) => [...prev, '']);
  };

  const handleAlertEmailChange = (index, value) => {
    setAlertEmails((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleRemoveAlertEmail = (index) => {
    setAlertEmails((prev) => prev.filter((_, i) => i !== index));
  };

  // Connection Test
  const handleTestConnection = async () => {
    const errorMsg = validateUrlFormat(formData.url);
    if (errorMsg) {
      setUrlError(errorMsg);
      return;
    }

    setUrlError('');
    setTestingConnection(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/endpoints/check-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: formData.url, method: formData.method }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Erreur lors du test de connexion');
      }

      setTestResult(data);
    } catch (err) {
      setTestResult({
        success: false,
        message: err.message || '✕ API inaccessible',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  // Webhook Test
  const handleTestWebhook = async () => {
    if (!webhookUrl.trim()) {
      setWebhookTestResult({
        success: false,
        message: 'Veuillez saisir une URL de webhook pour lancer le test.',
      });
      return;
    }

    const urlErr = validateUrlFormat(webhookUrl);
    if (urlErr) {
      setWebhookTestResult({
        success: false,
        message: urlErr,
      });
      return;
    }

    setTestingWebhook(true);
    setWebhookTestResult(null);

    try {
      const endpointId = initialData?.id;
      const targetRoute = endpointId
        ? `/api/endpoints/${endpointId}/webhook/test`
        : '/api/endpoints/check-url'; // Fallback if adding brand new

      let res;
      if (endpointId) {
        res = await fetch(targetRoute, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            webhookUrl: webhookUrl.trim(),
            webhookSecret: webhookSecret.trim() || undefined,
          }),
        });
      } else {
        // Direct test for new unsaved endpoints
        res = await fetch('/api/endpoints/check-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: webhookUrl.trim(), method: 'POST' }),
        });
      }

      const data = await res.json();
      setWebhookTestResult(data);
    } catch (err) {
      setWebhookTestResult({
        success: false,
        message: err.message || 'Échec du test de webhook',
      });
    } finally {
      setTestingWebhook(false);
    }
  };

  const handleClearWebhookSecret = () => {
    setClearWebhookSecret(true);
    setWebhookSecretConfigured(false);
    setWebhookSecret('');
  };

  // Form Submit
  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    // General tab validations
    if (!formData.name.trim()) {
      setActiveTab('general');
      setFormError('Le nom de l’API est requis');
      return;
    }

    const urlErr = validateUrlFormat(formData.url);
    if (urlErr) {
      setActiveTab('general');
      setUrlError(urlErr);
      setFormError(urlErr);
      return;
    }

    // Body tab validation
    const bodyErr = validateJsonString(bodyJson);
    if (bodyErr) {
      setActiveTab('body');
      setJsonError(bodyErr);
      setFormError(bodyErr);
      return;
    }

    // Build headersJson object from array
    const headersJsonObject = {};
    headers.forEach(({ key, value }) => {
      if (key && key.trim()) {
        headersJsonObject[key.trim()] = value;
      }
    });

    // Build queryParamsJson object from array
    const queryParamsJsonObject = {};
    queryParams.forEach(({ key, value }) => {
      if (key && key.trim()) {
        queryParamsJsonObject[key.trim()] = value;
      }
    });

    // Filter valid alert emails
    const validEmails = alertEmails
      .map((e) => e.trim())
      .filter((e) => e.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

    const payload = {
      name: formData.name.trim(),
      url: formData.url.trim(),
      method: formData.method,
      description: formData.description.trim() || null,
      isActive: formData.isActive,
      headersJson: Object.keys(headersJsonObject).length > 0 ? headersJsonObject : null,
      queryParamsJson: Object.keys(queryParamsJsonObject).length > 0 ? queryParamsJsonObject : null,
      bodyJson: bodyJson.trim() ? bodyJson.trim() : null,
      timeoutMs: parseInt(formData.timeoutMs, 10) || 5000,
      responseTimeThresholdMs: formData.responseTimeThresholdMs
        ? parseInt(formData.responseTimeThresholdMs, 10)
        : null,
      unhealthyThreshold: parseInt(formData.unhealthyThreshold, 10) || 1,
      recoveryThreshold: parseInt(formData.recoveryThreshold, 10) || 1,
      alertEmails: validEmails.length > 0 ? validEmails : null,
      webhookUrl: webhookUrl.trim() ? webhookUrl.trim() : null,
    };

    if (clearWebhookSecret) {
      payload.clearWebhookSecret = true;
      payload.webhookSecret = null;
    } else if (webhookSecret.trim().length > 0) {
      payload.webhookSecret = webhookSecret.trim();
    }

    onSubmit(payload);
  };

  const isUrlValid = !validateUrlFormat(formData.url) && formData.url.trim().length > 0;
  const isBodyJsonValid = !validateJsonString(bodyJson);
  const isFormValid = formData.name.trim().length > 0 && isUrlValid && isBodyJsonValid;

  const isSensitiveHeader = (keyName) => {
    if (!keyName) return false;
    const lower = keyName.toLowerCase();
    return (
      lower.includes('auth') ||
      lower.includes('key') ||
      lower.includes('token') ||
      lower.includes('secret')
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-700 pb-3">
        <h2 className="text-lg font-bold text-white">
          {initialData ? 'Modifier l’API' : 'Ajouter une nouvelle API'}
        </h2>
      </div>

      {formError && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs flex items-center justify-between">
          <span>⚠️ {formError}</span>
          <button type="button" onClick={() => setFormError('')} className="text-red-300 font-bold">×</button>
        </div>
      )}

      {/* 4 Tabs Header Navigation */}
      <div className="flex border-b border-slate-700 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
            activeTab === 'general'
              ? 'bg-slate-700/60 text-indigo-400 border-indigo-500'
              : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-700/30'
          }`}
        >
          ⚙️ Général
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('request')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
            activeTab === 'request'
              ? 'bg-slate-700/60 text-indigo-400 border-indigo-500'
              : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-700/30'
          }`}
        >
          🔌 Requête (Headers & Params) {headers.length > 0 || queryParams.length > 0 ? `(${headers.length + queryParams.length})` : ''}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('body')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
            activeTab === 'body'
              ? 'bg-slate-700/60 text-indigo-400 border-indigo-500'
              : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-700/30'
          }`}
        >
          📝 Corps (Body JSON) {bodyJson.trim() ? '•' : ''}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('alerts')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
            activeTab === 'alerts'
              ? 'bg-slate-700/60 text-indigo-400 border-indigo-500'
              : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-700/30'
          }`}
        >
          🚨 Alertes & Seuils {alertEmails.length > 0 ? `(${alertEmails.length} emails)` : ''}
        </button>
      </div>

      {/* TAB 1: GENERAL */}
      {activeTab === 'general' && (
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
              Nom de l’API *
            </label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="ex: Payment Service API"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase text-slate-400">
              API URL *
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <input
                  type="url"
                  name="url"
                  required
                  value={formData.url}
                  onChange={handleChange}
                  placeholder="https://api.example.com/users"
                  className={`w-full bg-slate-900 border ${
                    urlError ? 'border-red-500/80 focus:border-red-500' : 'border-slate-700 focus:border-indigo-500'
                  } rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none transition-colors font-mono`}
                />
              </div>

              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testingConnection || !formData.url.trim()}
                className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 px-4 py-2 rounded-lg text-xs font-medium transition-colors border border-slate-600 whitespace-nowrap flex items-center justify-center"
              >
                {testingConnection ? 'Connexion en cours...' : 'Tester la connexion'}
              </button>
            </div>

            {urlError && <p className="text-xs text-rose-400 font-medium">{urlError}</p>}

            {testResult && (
              <div
                className={`p-3 rounded-lg text-xs font-mono border flex items-center space-x-2 ${
                  testResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                }`}
              >
                <span>{testResult.success ? '✓' : '✕'}</span>
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Méthode HTTP
              </label>
              <select
                name="method"
                value={formData.method}
                onChange={handleChange}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Surveillance
              </label>
              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="isActive" className="text-sm text-slate-300">
                  Active (Surveillance automatique)
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
              Description (Optionnelle)
            </label>
            <textarea
              name="description"
              rows={2}
              value={formData.description}
              onChange={handleChange}
              placeholder="Description ou notes concernant cet endpoint..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>
      )}

      {/* TAB 2: REQUEST (Headers & Query Params) */}
      {activeTab === 'request' && (
        <div className="space-y-6">
          {/* Headers Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">En-têtes HTTP (Headers)</h3>
                <p className="text-[11px] text-slate-400">
                  Définissez des en-têtes personnalisés (ex: Content-Type, Authorization).
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddHeader}
                className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-medium px-3 py-1.5 rounded-lg border border-indigo-500/30 transition-colors"
              >
                + Ajouter un header
              </button>
            </div>

            {headers.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">Aucun en-tête configuré.</p>
            ) : (
              <div className="space-y-2">
                {headers.map((h, index) => {
                  const sensitive = isSensitiveHeader(h.key);
                  return (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Clé (ex: Authorization)"
                        value={h.key}
                        onChange={(e) => handleHeaderChange(index, 'key', e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:border-indigo-500"
                      />
                      <input
                        type={sensitive ? 'password' : 'text'}
                        placeholder="Valeur (ex: Bearer token)"
                        value={h.value}
                        onChange={(e) => handleHeaderChange(index, 'value', e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveHeader(index)}
                        className="text-slate-400 hover:text-rose-400 p-1.5 rounded transition-colors"
                        title="Supprimer"
                      >
                        🗑
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Query Params Section */}
          <div className="space-y-3 border-t border-slate-700/60 pt-4">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Paramètres de requête (Query Parameters)</h3>
                <p className="text-[11px] text-slate-400">
                  Paramètres ajoutés automatiquement à l&apos;URL (?page=1&limit=20).
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddQueryParam}
                className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-medium px-3 py-1.5 rounded-lg border border-indigo-500/30 transition-colors"
              >
                + Ajouter un paramètre
              </button>
            </div>

            {queryParams.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">Aucun paramètre configuré.</p>
            ) : (
              <div className="space-y-2">
                {queryParams.map((q, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Clé (ex: page)"
                      value={q.key}
                      onChange={(e) => handleQueryParamChange(index, 'key', e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:border-indigo-500"
                    />
                    <input
                      type="text"
                      placeholder="Valeur (ex: 1)"
                      value={q.value}
                      onChange={(e) => handleQueryParamChange(index, 'value', e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveQueryParam(index)}
                      className="text-slate-400 hover:text-rose-400 p-1.5 rounded transition-colors"
                      title="Supprimer"
                    >
                      🗑
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: BODY JSON */}
      {activeTab === 'body' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
              Corps de la requête (Body JSON)
            </label>
            <p className="text-xs text-slate-400 mb-3">
              Insérez le payload JSON envoyé lors des requêtes HTTP (`POST`, `PUT`, `PATCH`).
            </p>

            {(formData.method === 'GET' || formData.method === 'DELETE') && (
              <div className="p-3 bg-slate-900/60 border border-slate-700 rounded-lg text-amber-400 text-xs mb-3 flex items-center space-x-2">
                <span>ℹ️</span>
                <span>
                  Les requêtes <strong>{formData.method}</strong> ne nécessitent généralement pas de corps de requête.
                </span>
              </div>
            )}

            <textarea
              rows={8}
              value={bodyJson}
              onChange={(e) => {
                const val = e.target.value;
                setBodyJson(val);
                setJsonError(validateJsonString(val));
              }}
              placeholder={`{\n  "email": "user@example.com",\n  "status": "active"\n}`}
              className={`w-full bg-slate-900 border ${
                jsonError ? 'border-rose-500 focus:border-rose-500' : 'border-slate-700 focus:border-indigo-500'
              } rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none transition-colors`}
            />

            {jsonError ? (
              <p className="text-xs text-rose-400 font-semibold mt-1">❌ {jsonError}</p>
            ) : bodyJson.trim() ? (
              <p className="text-xs text-emerald-400 font-semibold mt-1">✓ Syntaxe JSON valide</p>
            ) : null}
          </div>
        </div>
      )}

      {/* TAB 4: ALERTS & THRESHOLDS */}
      {activeTab === 'alerts' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Timeout */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Timeout maximal (ms)
              </label>
              <input
                type="number"
                name="timeoutMs"
                min={500}
                max={30000}
                value={formData.timeoutMs}
                onChange={handleChange}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">Plage autorisée : 500 ms à 30 000 ms (5s par défaut).</p>
            </div>

            {/* Response Time Threshold */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Seuil de temps de réponse (ms) (Optionnel)
              </label>
              <input
                type="number"
                name="responseTimeThresholdMs"
                min={50}
                max={30000}
                placeholder="ex: 1000 (Laissez vide pour aucun seuil)"
                value={formData.responseTimeThresholdMs}
                onChange={handleChange}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">Seuil de latence pour alerte de ralentissement (50-30000 ms).</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-700/60 pt-4">
            {/* Unhealthy Threshold */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Échecs consécutifs avant incident
              </label>
              <input
                type="number"
                name="unhealthyThreshold"
                min={1}
                max={10}
                value={formData.unhealthyThreshold}
                onChange={handleChange}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">Nombre d&apos;échecs requis avant d&apos;ouvrir un incident (1 à 10).</p>
            </div>

            {/* Recovery Threshold */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Succès consécutifs avant rétablissement
              </label>
              <input
                type="number"
                name="recoveryThreshold"
                min={1}
                max={10}
                value={formData.recoveryThreshold}
                onChange={handleChange}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">Nombre de succès requis avant de fermer l&apos;incident (1 à 10).</p>
            </div>
          </div>

          {/* Multi-email Recipients */}
          <div className="border-t border-slate-700/60 pt-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Destinataires des alertes (Emails d&apos;astreinte)</h3>
                <p className="text-[11px] text-slate-400">
                  Adresses email secondaires qui recevront les alertes pour cette API.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddAlertEmail}
                className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-medium px-3 py-1.5 rounded-lg border border-indigo-500/30 transition-colors"
              >
                + Ajouter un destinataire
              </button>
            </div>

            {alertEmails.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">Aucun destinataire secondaire configuré.</p>
            ) : (
              <div className="space-y-2">
                {alertEmails.map((email, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="email"
                      placeholder="dev@example.com"
                      value={email}
                      onChange={(e) => handleAlertEmailChange(index, e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveAlertEmail(index)}
                      className="text-slate-400 hover:text-rose-400 p-1.5 rounded transition-colors"
                      title="Supprimer"
                    >
                      🗑
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Webhook Configuration */}
          <div className="border-t border-slate-700/60 pt-4 space-y-4">
            <div className="border-b border-slate-700/60 pb-2">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <span>🌐 Intégration Webhook</span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-mono font-medium">
                  HMAC-SHA256
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                APIWatch enverra un appel HTTP POST (avec signature) lors des ouvertures et résolutions d&apos;incidents.
              </p>
            </div>

            <div className="space-y-3">
              {/* Webhook URL */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  URL du Webhook (HTTP / HTTPS)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://api.monsite.com/webhooks/apiwatch"
                    value={webhookUrl}
                    onChange={(e) => {
                      setWebhookUrl(e.target.value);
                      if (webhookTestResult) setWebhookTestResult(null);
                    }}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleTestWebhook}
                    disabled={testingWebhook || !webhookUrl.trim()}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5"
                  >
                    {testingWebhook ? (
                      <>
                        <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        Test en cours...
                      </>
                    ) : (
                      'Tester le webhook'
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Reçoit les événements <code className="text-indigo-300">INCIDENT_OPENED</code> et <code className="text-indigo-300">INCIDENT_RESOLVED</code>.
                </p>
              </div>

              {/* Webhook Secret */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold uppercase text-slate-400">
                    Secret de Signature HMAC (Optionnel)
                  </label>
                  {webhookSecretConfigured && !clearWebhookSecret && (
                    <span className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded flex items-center gap-1">
                      🔒 Secret configuré
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder={
                      webhookSecretConfigured && !clearWebhookSecret
                        ? '•••••••••••••••• (laisser vide pour conserver)'
                        : 'Entrez une clé secrète pour signer les requêtes'
                    }
                    value={webhookSecret}
                    onChange={(e) => {
                      setWebhookSecret(e.target.value);
                      if (clearWebhookSecret) setClearWebhookSecret(false);
                      if (webhookTestResult) setWebhookTestResult(null);
                    }}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 font-mono text-xs"
                  />
                  {webhookSecretConfigured && !clearWebhookSecret && (
                    <button
                      type="button"
                      onClick={handleClearWebhookSecret}
                      className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
                      title="Supprimer la clé secrète"
                    >
                      Désactiver le secret
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  En-tête généré : <code className="text-slate-400">X-APIWatch-Signature: sha256=&lt;hmac&gt;</code>.
                </p>
              </div>

              {/* Webhook Test Result Banner */}
              {webhookTestResult && (
                <div
                  className={`p-3 rounded-lg border text-xs flex items-center justify-between transition-all ${
                    webhookTestResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{webhookTestResult.success ? '✅' : '❌'}</span>
                    <span>{webhookTestResult.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWebhookTestResult(null)}
                    className="text-slate-400 hover:text-white font-bold ml-2"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer Controls */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700/60">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Annuler
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading || !isFormValid}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors"
        >
          {isLoading ? 'Enregistrement...' : initialData ? 'Enregistrer les modifications' : 'Ajouter l’API'}
        </button>
      </div>
    </form>
  );
}
