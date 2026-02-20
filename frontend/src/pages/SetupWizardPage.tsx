import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Upload, Building2, Globe } from 'lucide-react';
import Layout from '../components/Layout';
import { authAPI } from '../lib/api';

const TIMEZONES = [
  'Europe/Berlin',
  'Europe/London',
  'Europe/Paris',
  'Europe/Madrid',
  'Europe/Amsterdam',
  'Europe/Vienna',
  'Europe/Zurich',
  'Europe/Rome',
  'Europe/Brussels',
  'Europe/Budapest',
  'UTC',
];

interface SetupData {
  organizationName: string;
  timezone: string;
  logo: File | null;
}

export default function SetupWizardPage() {
  const [step, setStep] = useState(1);
  const [setupData, setSetupData] = useState<SetupData>({
    organizationName: '',
    timezone: 'Europe/Berlin',
    logo: null,
  });
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [error, setError] = useState('');

  const setupMutation = useMutation({
    mutationFn: async () => {
      // Step 1: Setup organization
      const setupResponse = await authAPI.post('/admin/settings/setup', {
        organizationName: setupData.organizationName,
        timezone: setupData.timezone,
      });

      // Step 2: Upload logo if provided
      if (setupData.logo) {
        const formData = new FormData();
        formData.append('logo', setupData.logo);
        await authAPI.post('/admin/upload/logo', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      return setupResponse;
    },
    onSuccess: () => {
      // Redirect to dashboard
      window.location.href = '/';
    },
    onError: (error: any) => {
      setError(error.response?.data?.error || 'Setup fehlgeschlagen');
    },
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSetupData({ ...setupData, logo: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSetupData({ ...setupData, organizationName: e.target.value });
  };

  const handleTimezoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSetupData({ ...setupData, timezone: e.target.value });
  };

  const handleNext = () => {
    if (step === 1) {
      if (!setupData.organizationName.trim()) {
        setError('Vereinsname ist erforderlich');
        return;
      }
      setError('');
      setStep(2);
    } else if (step === 2) {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
      setError('');
    }
  };

  const handleComplete = () => {
    setupMutation.mutate();
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Willkommen bei TeamPilot
            </h1>
            <p className="text-lg text-gray-600">
              Lassen Sie uns Ihren Verein einrichten
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            {/* Step Indicators */}
            <div className="flex items-center justify-between mb-8">
              {[1, 2].map((s) => (
                <div key={s} className="flex items-center flex-1">
                  <div
                    className={`flex items-center justify-center w-12 h-12 rounded-full font-bold ${
                      s <= step
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {s}
                  </div>
                  {s < 2 && (
                    <div
                      className={`flex-1 h-1 mx-2 ${
                        s < step ? 'bg-primary-600' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            {/* Step 1: Organization Name & Timezone */}
            {step === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Building2 className="w-6 h-6 text-primary-600" />
                  Grundinformationen
                </h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vereinsname *
                  </label>
                  <input
                    type="text"
                    value={setupData.organizationName}
                    onChange={handleNameChange}
                    placeholder="z.B. FC Bayern München"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Globe className="w-4 h-4 inline mr-2" />
                    Zeitzone
                  </label>
                  <select
                    value={setupData.timezone}
                    onChange={handleTimezoneChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </div>

                <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                  💡 Die Zeitzone wird für die Anzeige und Speicherung von Ereigniszeiten
                  verwendet.
                </p>
              </div>
            )}

            {/* Step 2: Logo Upload */}
            {step === 2 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Upload className="w-6 h-6 text-primary-600" />
                  Vereins-Logo (Optional)
                </h2>

                <div className="bg-gray-50 rounded-lg p-8 text-center border-2 border-dashed border-gray-300 hover:border-primary-500 transition">
                  {logoPreview ? (
                    <div className="space-y-4">
                      <img
                        src={logoPreview}
                        alt="Logo Vorschau"
                        className="max-h-48 mx-auto rounded-lg"
                      />
                      <p className="text-sm text-gray-600">
                        {setupData.logo?.name}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-12 h-12 mx-auto text-gray-400" />
                      <p className="text-sm text-gray-600">
                        Ziehen Sie das Logo hier hin oder klicken Sie zum Hochladen
                      </p>
                    </div>
                  )}

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="absolute opacity-0 w-full h-full cursor-pointer"
                    style={{ position: 'absolute', left: 0, top: 0 }}
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </div>

                <label className="flex cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                  />
                </label>

                <p className="text-sm text-gray-600">
                  Das Logo wird als Vereins-Branding in der App angezeigt. Maximale Größe:
                  5 MB (JPG, PNG, GIF, WebP)
                </p>
              </div>
            )}

            {/* Summary */}
            {step === 2 && (
              <div className="mt-8 p-4 bg-primary-50 rounded-lg border border-primary-200">
                <h3 className="font-bold text-primary-900 mb-2">Zusammenfassung:</h3>
                <div className="space-y-1 text-sm text-primary-800">
                  <p>
                    <strong>Vereinsname:</strong> {setupData.organizationName}
                  </p>
                  <p>
                    <strong>Zeitzone:</strong> {setupData.timezone}
                  </p>
                  {setupData.logo && (
                    <p>
                      <strong>Logo:</strong> {setupData.logo.name}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-4 mt-8">
              {step > 1 && (
                <button
                  onClick={handlePrevious}
                  disabled={setupMutation.isPending}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Zurück
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={setupMutation.isPending}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {step === 2 && setupMutation.isPending && 'Wird eingerichtet...'}
                {step === 2 && !setupMutation.isPending && 'Setup fertigstellen'}
                {step === 1 && 'Weiter →'}
              </button>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-gray-600 text-sm mt-8">
            Ihre Daten werden sicher auf Ihrem Server gespeichert
          </p>
        </div>
      </div>
    </Layout>
  );
}
