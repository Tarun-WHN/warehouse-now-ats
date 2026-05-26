'use client';

import { useState, useEffect } from 'react';
import { Interview, Candidate, Job, TeamMember } from '@/lib/types';
import { Modal } from '@/components/Modal';
import {
  Calendar, Plus, Video, Phone, Users as UsersIcon, MapPin,
  Clock, ChevronLeft, ChevronRight, LayoutList, CalendarDays
} from 'lucide-react';

const interviewStatusColors: Record<string, string> = {
  Scheduled: 'bg-blue-100 text-blue-800',
  Completed: 'bg-green-100 text-green-800',
  Cancelled: 'bg-gray-100 text-gray-800',
  'No Show': 'bg-red-100 text-red-800',
};

const typeIcons: Record<string, typeof Video> = {
  'Video Call': Video, Phone: Phone, 'In Person': MapPin, Panel: UsersIcon,
};

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [showCreate, setShowCreate] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [calMonth, setCalMonth] = useState(new Date());
  const [form, setForm] = useState({
    candidate_id: '', job_id: '', interviewer_id: '',
    scheduled_at: '', duration: 60, type: 'Video Call' as string,
    location: '', notes: '',
  });

  const fetchInterviews = () => fetch('/api/interviews').then(r => r.json()).then(setInterviews);
  useEffect(() => {
    fetchInterviews();
    fetch('/api/candidates?per_page=1000').then(r => r.json()).then(d => setCandidates(d.candidates || []));
    fetch('/api/jobs').then(r => r.json()).then(setJobs);
    fetch('/api/team').then(r => r.json()).then(setTeam);
  }, []);

  const handleCreate = async () => {
    await fetch('/api/interviews', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setShowCreate(false);
    setForm({ candidate_id: '', job_id: '', interviewer_id: '', scheduled_at: '', duration: 60, type: 'Video Call', location: '', notes: '' });
    fetchInterviews();
  };

  const handleStatusChange = async (id: string, status: string) => {
    await fetch(`/api/interviews/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchInterviews();
  };

  const upcoming = interviews.filter(i => i.status === 'Scheduled' && new Date(i.scheduled_at) >= new Date());
  const past = interviews.filter(i => i.status !== 'Scheduled' || new Date(i.scheduled_at) < new Date());

  // Calendar helpers
  const calStart = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1);
  const calEnd = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0);
  const startDay = calStart.getDay();
  const daysInMonth = calEnd.getDate();
  const calDays = Array.from({ length: 42 }, (_, i) => {
    const d = i - startDay + 1;
    return d > 0 && d <= daysInMonth ? d : null;
  });

  const getInterviewsForDay = (day: number) => {
    const dateStr = `${calMonth.getFullYear()}-${String(calMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return interviews.filter(i => i.scheduled_at.startsWith(dateStr));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy flex items-center gap-2"><Calendar size={24} /> Interviews</h1>
          <p className="text-text-secondary text-sm mt-1">{upcoming.length} upcoming interview{upcoming.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => setView('list')} className={`px-3 py-1.5 rounded-md text-sm font-medium ${view === 'list' ? 'bg-white shadow-sm text-navy' : 'text-gray-500'}`}>
              <LayoutList size={16} />
            </button>
            <button onClick={() => setView('calendar')} className={`px-3 py-1.5 rounded-md text-sm font-medium ${view === 'calendar' ? 'bg-white shadow-sm text-navy' : 'text-gray-500'}`}>
              <CalendarDays size={16} />
            </button>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="bg-gold text-navy-dark px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-gold-dark flex items-center gap-2">
            <Plus size={16} /> Schedule Interview
          </button>
        </div>
      </div>

      {view === 'list' ? (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-navy mb-3 uppercase tracking-wider">Upcoming</h2>
              <div className="space-y-2">
                {upcoming.map(i => {
                  const TypeIcon = typeIcons[i.type] || Video;
                  return (
                    <div key={i.id} className="bg-white rounded-xl border border-whn-border p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
                      <div className="w-12 h-12 bg-navy/5 rounded-lg flex items-center justify-center flex-shrink-0">
                        <TypeIcon size={20} className="text-navy" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-navy">{i.candidate_name || 'Unknown'}</p>
                        <p className="text-sm text-text-secondary">{i.job_title || 'General'} {i.interviewer_name ? `| Interviewer: ${i.interviewer_name}` : ''}</p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-medium text-navy">{new Date(i.scheduled_at).toLocaleDateString()}</p>
                        <p className="text-text-secondary flex items-center gap-1 justify-end">
                          <Clock size={12} />
                          {new Date(i.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {' '}({i.duration}min)
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <select value={i.status} onChange={e => handleStatusChange(i.id, e.target.value)}
                          className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer ${interviewStatusColors[i.status]}`}>
                          <option>Scheduled</option>
                          <option>Completed</option>
                          <option>Cancelled</option>
                          <option>No Show</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wider">Past / Completed</h2>
              <div className="space-y-2">
                {past.map(i => (
                  <div key={i.id} className="bg-white rounded-xl border border-whn-border p-4 flex items-center gap-4 opacity-70">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Calendar size={20} className="text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-navy">{i.candidate_name || 'Unknown'}</p>
                      <p className="text-sm text-text-secondary">{i.job_title || 'General'}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-text-secondary">{new Date(i.scheduled_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${interviewStatusColors[i.status]}`}>{i.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {interviews.length === 0 && (
            <div className="text-center py-16 text-text-secondary">
              <Calendar size={48} className="mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No interviews scheduled</p>
              <p className="text-sm mt-1">Schedule your first interview to get started</p>
            </div>
          )}
        </div>
      ) : (
        /* Calendar View */
        <div className="bg-white rounded-xl border border-whn-border p-6">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1))} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft size={18} /></button>
            <h2 className="text-lg font-bold text-navy">
              {calMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1))} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight size={18} /></button>
          </div>
          <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="bg-gray-50 p-2 text-center text-xs font-semibold text-gray-500">{d}</div>
            ))}
            {calDays.map((day, i) => {
              const dayInterviews = day ? getInterviewsForDay(day) : [];
              const isToday = day && new Date().getDate() === day && new Date().getMonth() === calMonth.getMonth() && new Date().getFullYear() === calMonth.getFullYear();
              return (
                <div key={i} className={`bg-white min-h-[80px] p-1 ${!day ? 'bg-gray-50' : ''}`}>
                  {day && (
                    <>
                      <span className={`text-xs font-medium ${isToday ? 'bg-gold text-navy-dark w-6 h-6 rounded-full flex items-center justify-center' : 'text-gray-600'}`}>{day}</span>
                      {dayInterviews.map(iv => (
                        <div key={iv.id} className="mt-0.5 px-1 py-0.5 bg-navy/10 rounded text-[10px] text-navy truncate" title={`${iv.candidate_name} - ${iv.type}`}>
                          {new Date(iv.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {iv.candidate_name?.split(' ')[0]}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <Modal open={true} title="Schedule Interview" onClose={() => setShowCreate(false)} size="lg">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-text-secondary">Candidate *</label>
              <select value={form.candidate_id} onChange={e => setForm({ ...form, candidate_id: e.target.value })}
                className="w-full mt-1 px-3 py-2.5 border border-whn-border rounded-lg text-sm">
                <option value="">Select candidate</option>
                {candidates.map(c => <option key={c.id} value={c.id}>{c.full_name} {c.current_designation ? `- ${c.current_designation}` : ''}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-text-secondary">Job (optional)</label>
                <select value={form.job_id} onChange={e => setForm({ ...form, job_id: e.target.value })}
                  className="w-full mt-1 px-3 py-2.5 border border-whn-border rounded-lg text-sm">
                  <option value="">Select job</option>
                  {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-text-secondary">Interviewer</label>
                <select value={form.interviewer_id} onChange={e => setForm({ ...form, interviewer_id: e.target.value })}
                  className="w-full mt-1 px-3 py-2.5 border border-whn-border rounded-lg text-sm">
                  <option value="">Select interviewer</option>
                  {team.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-text-secondary">Date & Time *</label>
                <input type="datetime-local" value={form.scheduled_at} onChange={e => setForm({ ...form, scheduled_at: e.target.value })}
                  className="w-full mt-1 px-3 py-2.5 border border-whn-border rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-text-secondary">Duration (min)</label>
                <input type="number" min={15} step={15} value={form.duration} onChange={e => setForm({ ...form, duration: parseInt(e.target.value) || 60 })}
                  className="w-full mt-1 px-3 py-2.5 border border-whn-border rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-text-secondary">Type</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                  className="w-full mt-1 px-3 py-2.5 border border-whn-border rounded-lg text-sm">
                  <option>Video Call</option>
                  <option>Phone</option>
                  <option>In Person</option>
                  <option>Panel</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary">Location / Link</label>
              <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
                className="w-full mt-1 px-3 py-2.5 border border-whn-border rounded-lg text-sm" placeholder="e.g. Google Meet link or office address" />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary">Notes</label>
              <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                className="w-full mt-1 px-3 py-2.5 border border-whn-border rounded-lg text-sm" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handleCreate} disabled={!form.candidate_id || !form.scheduled_at}
                className="bg-gold text-navy-dark px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-gold-dark disabled:opacity-50">
                Schedule Interview
              </button>
              <button onClick={() => setShowCreate(false)} className="px-6 py-2.5 rounded-lg text-sm font-medium border border-whn-border hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
