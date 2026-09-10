'use client';

import { useState } from 'react';

export default function ApiForm({ initialData = null, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    url: initialData?.url || '',
    method: initialData?.method || 'GET',
    description: initialData?.description || '',
    isActive: initialData?.isActive ?? true,
  });

  const [formError, setFormError] = useState('');
  const [urlError, setUrlError] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Le nom de l’API est requis');
      return;
    }

    const urlErr = validateUrlFormat(formData.url);
    if (urlErr) {
      setUrlError(urlErr);
      setFormError(urlErr);
      return;
    }

    onSubmit(formData);
  };

  const isUrlValid = !validateUrlFormat(formData.url) && formData.url.trim().length > 0;
  const isFormValid = formData.name.trim().length > 0 && isUrlValid;

  return (
    <form onSubmit={handleSubmit} className="space-y-5 bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl">
      <h2 className="text-lg font-bold text-white">
        {initialData ? 'Modifier l’API' : 'Ajouter une nouvelle API'}
      </h2>

      {formError && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs">
          {formError}
        </div>
      )}

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

        {urlError && (
          <p className="text-xs text-rose-400 font-medium">{urlError}</p>
        )}

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
              Active (Surveillance future)
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
