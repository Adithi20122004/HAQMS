'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/common/Navbar';
import Link from 'next/link';
import { ArrowLeft, ClipboardList, CalendarDays, AlertCircle } from 'lucide-react';

export default function PatientHistoryRecords() {
  const { user, token, API_BASE_URL } = useAuth();
  const { id } = useParams();
  const router = useRouter();

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchPatientDetails();
  }, [user]);

  const fetchPatientDetails = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/patients/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch patient records.');
      }

      const data = await res.json();
      setPatient(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto p-6 sm:p-8">

        {/* Back Button */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-teal-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="pulse-loader">
              <div></div>
              <div></div>
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-400">
              Loading patient records...
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center gap-3 text-sm">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div>
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}

        {/* Patient Data */}
        {!loading && patient && (
          <div className="space-y-6">

            {/* Patient Header */}
            <div className="glass p-6 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-xl">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
                    {patient.name}
                  </h1>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest mt-0.5">
                    Diagnostic Reports — Legacy Records
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <div>
                  <span className="block text-xxs uppercase tracking-wider text-slate-400 mb-1">Age</span>
                  <span className="text-slate-800 dark:text-slate-200 font-bold">{patient.age} yrs</span>
                </div>
                <div>
                  <span className="block text-xxs uppercase tracking-wider text-slate-400 mb-1">Gender</span>
                  <span className="text-slate-800 dark:text-slate-200 font-bold capitalize">{patient.gender}</span>
                </div>
                <div>
                  <span className="block text-xxs uppercase tracking-wider text-slate-400 mb-1">Phone</span>
                  <span className="text-slate-800 dark:text-slate-200 font-bold">{patient.phoneNumber}</span>
                </div>
                <div>
                  <span className="block text-xxs uppercase tracking-wider text-slate-400 mb-1">Email</span>
                  <span className="text-slate-800 dark:text-slate-200 font-bold">{patient.email || '—'}</span>
                </div>
              </div>
            </div>

            {/* Medical History */}
            <div className="glass p-6 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800">
              <h2 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-3">
                Clinical Background / Medical History
              </h2>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300 leading-6">
                {patient.medicalHistory
                  ? patient.medicalHistory
                  : <span className="italic text-slate-400">No medical history recorded for this patient.</span>
                }
              </div>
            </div>

            {/* Appointments History */}
            <div className="glass p-6 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800">
              <h2 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-teal-600" />
                Appointment History
              </h2>

              {patient.appointments && patient.appointments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm text-left">
                    <thead>
                      <tr className="text-slate-400 uppercase tracking-widest text-xxs font-bold border-b border-slate-200 dark:border-slate-800">
                        <th className="pb-3">Date</th>
                        <th className="pb-3">Reason</th>
                        <th className="pb-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {patient.appointments.map((app) => (
                        <tr key={app.id} className="hover:bg-slate-500/5 transition-colors">
                          <td className="py-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                            {new Date(app.appointmentDate).toLocaleDateString([], {
                              year: 'numeric', month: 'short', day: 'numeric',
                            })}
                            <span className="block text-xxs text-slate-400 font-normal mt-0.5">
                              {new Date(app.appointmentDate).toLocaleTimeString([], {
                                hour: '2-digit', minute: '2-digit',
                              })}
                            </span>
                          </td>
                          <td className="py-3 text-slate-500 dark:text-slate-400">
                            {app.reason || 'No reason provided'}
                          </td>
                          <td className="py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded text-xxs font-extrabold tracking-wide uppercase ${
                              app.status === 'COMPLETED'
                                ? 'bg-teal-500/10 text-teal-600'
                                : app.status === 'CANCELLED'
                                ? 'bg-rose-500/10 text-rose-500'
                                : 'bg-amber-500/10 text-amber-500'
                            }`}>
                              {app.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic text-center py-6">
                  No appointment records found for this patient.
                </p>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  );
}