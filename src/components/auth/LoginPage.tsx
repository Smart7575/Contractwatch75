import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Lock,
  Mail,
  User as UserIcon,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  Sparkles,
  Clock,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import {
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  resetPassword,
} from '../../lib/firebaseService';

export const LoginPage: React.FC = () => {
  const { user } = useApp();

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      if (mode === 'forgot') {
        if (!email.includes('@')) {
          setErrorMessage('Vul een geldig e-mailadres in.');
          setIsSubmitting(false);
          return;
        }
        const res = await resetPassword(email);
        if (res.success) {
          setSuccessMessage(`Er is een wachtwoord-herstellink gestuurd naar ${email}. Controleer je inbox.`);
        } else {
          setErrorMessage(res.error || 'Kon herstellink niet versturen.');
        }
        setIsSubmitting(false);
        return;
      }

      if (!email.includes('@')) {
        setErrorMessage('Vul een geldig e-mailadres in.');
        setIsSubmitting(false);
        return;
      }

      if (password.length < 6) {
        setErrorMessage('Het wachtwoord moet minimaal 6 tekens lang zijn.');
        setIsSubmitting(false);
        return;
      }

      if (mode === 'signup') {
        const res = await registerWithEmail(email, password, name || email.split('@')[0]);
        if (!res.success) {
          setErrorMessage(res.error || 'Registratie mislukt.');
        }
      } else {
        const res = await loginWithEmail(email, password);
        if (!res.success) {
          setErrorMessage(res.error || 'Inloggen mislukt. Controleer je gegevens.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Er is een onverwachte fout opgetreden.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);
    try {
      const res = await loginWithGoogle();
      if (!res.success) {
        setErrorMessage(res.error || 'Google inloggen is niet gelukt.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Er is een fout opgetreden bij Google inloggen.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white font-bold text-xl shadow-lg shadow-indigo-600/30 mb-3.5">
            CW
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            ContractWatch
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Slim contract- en opzegtermijnbeheer. Voorkom ongewenste verlengingen en beheer je vaste lasten.
          </p>
        </div>

        {/* Main Authentication Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl p-6 sm:p-8 backdrop-blur-xl">
          {/* Mode Switcher Tabs */}
          {mode !== 'forgot' && (
            <div className="flex p-1 mb-6 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                  mode === 'signin'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Inloggen
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Nieuw Account
              </button>
            </div>
          )}

          {/* Social Google Login Button */}
          {mode !== 'forgot' && (
            <div className="mb-5">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold transition cursor-pointer shadow-2xs disabled:opacity-60"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Inloggen met Google</span>
              </button>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white dark:bg-slate-900 px-3 text-slate-400 font-medium">
                    of met e-mailadres
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'forgot' && (
              <div className="mb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  Wachtwoord herstellen
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Vul het e-mailadres van je account in. We sturen direct een herstellink.
                </p>
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Volledige Naam
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="bijv. Jan de Vries"
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                E-mailadres
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="naam@voorbeeld.nl"
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Wachtwoord
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setErrorMessage('');
                        setSuccessMessage('');
                      }}
                      className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      Wachtwoord vergeten?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={6}
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* Error & Success Alerts */}
            {errorMessage && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-indigo-600/20 transition cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Even geduld...</span>
                </>
              ) : mode === 'signin' ? (
                <>
                  <span>Inloggen</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : mode === 'signup' ? (
                <>
                  <span>Account Aanmaken</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <span>Herstellink Verzenden</span>
              )}
            </button>

            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className="w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 pt-2 cursor-pointer"
              >
                ← Terug naar inloggen
              </button>
            )}
          </form>
        </div>

        {/* Feature checklist footer */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
          <div className="p-3 rounded-2xl bg-white/60 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50">
            <Clock className="w-4 h-4 text-indigo-500 mx-auto mb-1.5" />
            <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
              Opzegtermijn Radar
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              Automatische notificaties
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-white/60 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50">
            <Layers className="w-4 h-4 text-purple-500 mx-auto mb-1.5" />
            <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
              Gezin & Individueel
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              Duidelijke scope-indeling
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-white/60 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50">
            <FileSpreadsheet className="w-4 h-4 text-emerald-500 mx-auto mb-1.5" />
            <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
              PDF & CSV Rapportage
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              Eenvoudig exporteren
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
