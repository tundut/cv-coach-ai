import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ChatMessage, ChatSession, Resume, JobAnalysis } from '@cv-coach/shared';
import { ChatRole, AnalysisStatus } from '@cv-coach/shared';
import { chatApi, ChatApiError } from '../api/chat.js';
import { resumeApi } from '../api/resumes.js';
import { jobAnalysisApi } from '../api/job-analyses.js';
import { AppHeader } from '../components/AppHeader.js';
import { Alert } from '../components/ui/Alert.js';
import { Markdown } from '../components/Markdown.js';
import { formatDate } from '../lib/format.js';

const SUGGESTIONS = [
  'Tại sao CV của tôi chỉ ở mức Moderate fit?',
  'Tôi nên bổ sung kỹ năng nào?',
  'Dự án nào nên được đưa lên đầu CV?',
  'Tôi nên học gì để phù hợp hơn với vị trí này?',
];

export default function Chat() {
  const [params] = useSearchParams();
  const resumeId = params.get('resumeId') ?? undefined;
  const jobAnalysisId = params.get('jobAnalysisId') ?? undefined;

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Lựa chọn ngữ cảnh (CV + JD) cho chat mới
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [jobAnalyses, setJobAnalyses] = useState<JobAnalysis[]>([]);
  const [selectedResume, setSelectedResume] = useState<string>(resumeId ?? '');
  const [selectedJd, setSelectedJd] = useState<string>(jobAnalysisId ?? '');
  // Khi đang trong một session cũ, dropdown bị khóa (ngữ cảnh đã cố định)
  const inActiveSession = sessionId !== null;

  const loadSessions = async () => {
    try {
      setSessions(await chatApi.listSessions());
    } catch {
      // bỏ qua lỗi tải danh sách
    }
  };

  // Tải danh sách session + CV + JD khi vào trang
  useEffect(() => {
    void loadSessions();
    resumeApi
      .list()
      .then((all) => {
        const analyzed = all.filter((r) => r.analysisStatus === AnalysisStatus.COMPLETED);
        setResumes(analyzed);
        // Mặc định chọn CV mặc định nếu chưa có lựa chọn từ URL
        if (!resumeId) {
          const def = analyzed.find((r) => r.isDefault) ?? analyzed[0];
          if (def) setSelectedResume(def.id);
        }
      })
      .catch(() => {});
    jobAnalysisApi.list().then(setJobAnalyses).catch(() => {});
  }, [resumeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mở lại một session cũ
  const openSession = async (id: string) => {
    setError('');
    setSessionId(id);
    setMessages([]);
    // Đồng bộ dropdown theo ngữ cảnh của session đang mở
    const s = sessions.find((x) => x.id === id);
    if (s) {
      setSelectedResume(s.resumeId ?? '');
      setSelectedJd(s.jobAnalysisId ?? '');
    }
    try {
      const msgs = await chatApi.listMessages(id);
      setMessages(msgs);
    } catch (err) {
      setError(err instanceof ChatApiError ? err.message : 'Không tải được hội thoại');
    }
  };

  // Bắt đầu chat mới (chưa tạo session cho tới khi gửi tin nhắn đầu)
  const startNewChat = () => {
    setSessionId(null);
    setMessages([]);
    setError('');
  };

  const handleDeleteSession = async (id: string) => {
    try {
      await chatApi.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (id === sessionId) {
        setSessionId(null);
        setMessages([]);
      }
    } catch (err) {
      setError(err instanceof ChatApiError ? err.message : 'Xóa hội thoại thất bại');
    }
  };

  const send = async (text: string) => {
    if (!text.trim() || isSending) return;
    setError('');
    setInput('');
    setIsSending(true);

    const optimistic: ChatMessage = {
      id: `temp-${Date.now()}`,
      sessionId: sessionId ?? 'pending',
      role: ChatRole.USER,
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      // Lần đầu gửi mà chưa có session → tạo session với CV/JD đã chọn ở dropdown
      let sid = sessionId;
      if (!sid) {
        const session = await chatApi.createSession({
          resumeId: selectedResume || undefined,
          jobAnalysisId: selectedJd || undefined,
        });
        sid = session.id;
        setSessionId(sid);
      }

      const { userMessage, assistantMessage } = await chatApi.sendMessage(sid, text);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimistic.id),
        userMessage,
        assistantMessage,
      ]);
      void loadSessions();
    } catch (err) {
      setError(err instanceof ChatApiError ? err.message : 'Gửi tin nhắn thất bại');
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  return (
    <div className="h-screen bg-mesh flex flex-col overflow-hidden">
      <AppHeader />
      <main className="max-w-6xl w-full mx-auto p-6 flex-1 flex flex-col min-h-0 overflow-hidden">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4 shrink-0">Career Assistant</h2>

        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex-1 flex gap-4 min-h-0">
          {/* Sidebar: session cũ */}
          <aside className="w-64 shrink-0 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-gray-100">
              <button
                onClick={startNewChat}
                className="w-full rounded-lg bg-primary-600 text-white px-3 py-2 text-sm font-medium hover:bg-primary-700"
              >
                + Chat mới
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {sessions.length === 0 ? (
                <p className="text-xs text-gray-400 p-3">Chưa có hội thoại nào.</p>
              ) : (
                sessions.map((s) => (
                  <div
                    key={s.id}
                    className={`group flex items-start gap-1 px-3 py-2.5 border-b border-gray-50 hover:bg-gray-50 transition ${
                      s.id === sessionId ? 'bg-primary-50' : ''
                    }`}
                  >
                    <button
                      onClick={() => void openSession(s.id)}
                      className="flex-1 text-left min-w-0"
                    >
                      <p className="text-sm text-gray-700 truncate">
                        {s.title ?? 'Hội thoại mới'}
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(s.updatedAt)}</p>
                    </button>
                    <button
                      onClick={() => void handleDeleteSession(s.id)}
                      aria-label="Xóa hội thoại"
                      className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition px-1"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </aside>

          {/* Khung chat */}
          <div className="flex-1 min-w-0 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-4">
                  <p className="text-gray-400">
                    Hỏi AI về CV, công việc và hướng phát triển nghề nghiệp.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 max-w-md">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => void send(s)}
                        className="text-xs text-left bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 hover:border-primary-300 hover:bg-primary-50 transition"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.role === ChatRole.USER ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                        m.role === ChatRole.USER
                          ? 'bg-primary-600 text-white whitespace-pre-wrap'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {m.role === ChatRole.USER ? m.content : <Markdown content={m.content} />}
                    </div>
                  </div>
                ))
              )}
              {isSending && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-400 rounded-2xl px-4 py-2 text-sm">
                    Đang trả lời...
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-gray-100 p-3 space-y-2">
              {/* Dropdown chọn ngữ cảnh CV + JD */}
              <div className="flex flex-wrap gap-2">
                <select
                  value={selectedResume}
                  onChange={(e) => setSelectedResume(e.target.value)}
                  disabled={inActiveSession}
                  title="Chọn CV"
                  className="text-xs rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary-400 disabled:opacity-60 max-w-[48%]"
                >
                  <option value="">📄 CV: (không chọn)</option>
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      📄 {r.fileName}
                      {r.isDefault ? ' (mặc định)' : ''}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedJd}
                  onChange={(e) => setSelectedJd(e.target.value)}
                  disabled={inActiveSession}
                  title="Chọn Job Description"
                  className="text-xs rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary-400 disabled:opacity-60 max-w-[48%]"
                >
                  <option value="">🎯 JD: (không gắn)</option>
                  {jobAnalyses.map((j) => (
                    <option key={j.id} value={j.id}>
                      🎯 {j.jobTitle}
                      {j.companyName ? ` · ${j.companyName}` : ''}
                    </option>
                  ))}
                </select>

                {inActiveSession && (
                  <span className="text-xs text-gray-400 self-center">
                    (Đang trong hội thoại — bấm "+ Chat mới" để đổi ngữ cảnh)
                  </span>
                )}
              </div>

              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Nhập câu hỏi..."
                  disabled={isSending}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none disabled:bg-gray-50"
                />
                <button
                  type="submit"
                  disabled={isSending || !input.trim()}
                  className="rounded-lg bg-primary-600 text-white px-4 py-2 text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
                >
                  Gửi
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
