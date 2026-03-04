import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, Send, User, Bot, Plus, Search, MessageSquare, Paperclip, X, FileIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useCompany } from "@/context/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface FileData {
    name: string;
    base64: string;
    type: string;
}

interface Message {
    role: "user" | "assistant";
    content: string;
    id: string;
}

interface ChatSession {
    id: string;
    employeeId: string;
    title: string;
    createdAt: number;
    isPinned?: boolean;
}

interface StrategicRHAgentProps {
    selectedEmployeeId?: string;
    employeeName?: string;
}

export function StrategicRHAgent({ selectedEmployeeId, employeeName }: StrategicRHAgentProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [employeeSummary, setEmployeeSummary] = useState<any>(null);
    const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { user } = useAuth();
    const { companyId } = useCompany();
    const { toast } = useToast();

    // Load sessions index
    useEffect(() => {
        if (user?.id && companyId) {
            const sessionsKey = `chat_sessions_${companyId}_${user.id}`;
            const savedSessions = localStorage.getItem(sessionsKey);
            if (savedSessions) {
                try {
                    const parsedSessions = JSON.parse(savedSessions);
                    setSessions(parsedSessions);
                } catch (e) {
                    console.error("Error parsing sessions:", e);
                    setSessions([]);
                }
            } else {
                setSessions([]);
            }
        } else {
            setSessions([]);
            setMessages([]);
            setCurrentSessionId(null);
        }
    }, [user?.id, companyId]);

    // Update currentSessionId when employee change or sessions load
    useEffect(() => {
        if (!selectedEmployeeId || !user?.id) return;

        // Find most recent session for this employee
        const employeeSessions = sessions.filter(s => s.employeeId === selectedEmployeeId);
        if (employeeSessions.length > 0) {
            if (!currentSessionId || !employeeSessions.find(s => s.id === currentSessionId)) {
                setCurrentSessionId(employeeSessions[0].id);
            }
        } else {
            // Create initial session if none exist
            const newId = `${user.id}_${Date.now()}`;
            const newSession: ChatSession = {
                id: newId,
                employeeId: selectedEmployeeId,
                title: "Nova conversa",
                createdAt: Date.now()
            };
            setSessions(prev => [newSession, ...prev]);
            setCurrentSessionId(newId);
        }
    }, [selectedEmployeeId, sessions.length, user?.id]);

    // Load messages for current session
    useEffect(() => {
        if (currentSessionId && user?.id) {
            const messagesKey = `chat_messages_${user.id}_${currentSessionId}`;
            const savedMessages = localStorage.getItem(messagesKey);
            if (savedMessages) {
                try {
                    setMessages(JSON.parse(savedMessages));
                } catch (e) {
                    console.error("Error parsing saved messages:", e);
                    setMessages([]);
                }
            } else {
                setMessages([]);
            }
        } else {
            setMessages([]);
        }
    }, [currentSessionId, user?.id]);

    // Save messages and update session title
    useEffect(() => {
        if (currentSessionId && messages.length > 0 && user?.id) {
            const messagesKey = `chat_messages_${user.id}_${currentSessionId}`;
            localStorage.setItem(messagesKey, JSON.stringify(messages));

            // Auto-rename session if it's the first user message
            const firstUserMessage = messages.find(m => m.role === "user");
            const session = sessions.find(s => s.id === currentSessionId);

            if (firstUserMessage && session && session.title === "Nova conversa") {
                const newTitle = firstUserMessage.content.slice(0, 30) + (firstUserMessage.content.length > 30 ? "..." : "");
                const updatedSessions = sessions.map(s =>
                    s.id === currentSessionId ? { ...s, title: newTitle } : s
                );
                setSessions(updatedSessions);
                localStorage.setItem(`chat_sessions_${companyId}_${user.id}`, JSON.stringify(updatedSessions));
            }
        }
    }, [messages, currentSessionId, user?.id]);

    // Save sessions index when changed
    useEffect(() => {
        if (user?.id && companyId && sessions.length > 0) {
            const sessionsKey = `chat_sessions_${companyId}_${user.id}`;
            localStorage.setItem(sessionsKey, JSON.stringify(sessions));
        }
    }, [sessions, companyId, user?.id]);

    // Fetch employee history when selectedEmployeeId changes
    useEffect(() => {
        const fetchEmployeeSummary = async () => {
            if (!selectedEmployeeId || selectedEmployeeId === "all" || !companyId) {
                setEmployeeSummary(null);
                return;
            }

            try {
                // Fetch basic info and points
                const { data: emp } = await supabase
                    .from('employees')
                    .select('points, department, work_schedule_start')
                    .eq('id', selectedEmployeeId)
                    .single();

                // Fetch recent occurrences
                const { data: occ } = await supabase
                    .from('occurrences')
                    .select('type, description, created_at, points')
                    .eq('employee_id', selectedEmployeeId)
                    .order('created_at', { ascending: false })
                    .limit(5);

                // Fetch recent tasks
                const { data: tasks } = await supabase
                    .from('tasks')
                    .select('title, status, due_date')
                    .eq('assignee_id', selectedEmployeeId)
                    .order('created_at', { ascending: false })
                    .limit(5);

                // Fetch recent time tracking
                const { data: time } = await supabase
                    .from('time_tracking_records')
                    .select('record_date, entry_1, status')
                    .eq('employee_id', selectedEmployeeId)
                    .order('record_date', { ascending: false })
                    .limit(5);

                setEmployeeSummary({
                    points: emp?.points || 0,
                    department: emp?.department || "N/A",
                    schedule: emp?.work_schedule_start || "09:00",
                    recent_occurrences: occ || [],
                    recent_tasks: tasks || [],
                    recent_time_records: time || []
                });
            } catch (error) {
                console.error("Error fetching employee summary for context:", error);
            }
        };

        fetchEmployeeSummary();
    }, [selectedEmployeeId, companyId]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            toast({
                title: "Arquivo muito grande",
                description: "O tamanho máximo permitido é 10MB.",
                variant: "destructive"
            });
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target?.result as string;
            setSelectedFile({
                name: file.name,
                base64: base64,
                type: file.type
            });
        };
        reader.readAsDataURL(file);
    };

    const handleSend = async () => {
        if ((!input.trim() && !selectedFile) || isLoading) return;

        const userMessage: Message = {
            role: "user",
            content: input || (selectedFile ? `Enviou um arquivo: ${selectedFile.name}` : ""),
            id: Date.now().toString(),
        };

        setMessages((prev) => [...prev, userMessage]);
        const currentInput = input;
        const currentFile = selectedFile;

        setInput("");
        setSelectedFile(null);
        setIsLoading(true);

        try {
            // Prepare history for context (last 10 messages)
            const history = messages.slice(-10).map(m => ({
                role: m.role,
                content: m.content
            }));

            const response = await fetch("https://n8n.kaffspiel.cloud/webhook/rh-estrategico-multi", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sessionId: currentSessionId,
                    message: currentInput,
                    history: history,
                    file: currentFile,
                    context: {
                        employee_id: selectedEmployeeId === "all" ? null : selectedEmployeeId,
                        employee_name: employeeName,
                        employee_history: employeeSummary,
                        company_id: companyId,
                        user_id: user?.id,
                        user_name: user?.user_metadata?.name || "Gestor",
                    },
                }),
            });

            if (!response.ok) throw new Error("Falha na comunicação com o agente");

            const data = await response.json();

            const assistantMessage: Message = {
                role: "assistant",
                content: data.output || data.message || data.text || "Desculpe, não consegui processar sua solicitação no momento.",
                id: (Date.now() + 1).toString(),
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error) {
            console.error("Chat Error:", error);
            toast({
                title: "Erro no Assistente",
                description: "Não foi possível enviar sua mensagem. Verifique a conexão.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const startNewChat = () => {
        if (!selectedEmployeeId || !user?.id) return;

        const newId = `${user.id}_${Date.now()}`;
        const newSession: ChatSession = {
            id: newId,
            employeeId: selectedEmployeeId,
            title: "Nova conversa",
            createdAt: Date.now(),
            isPinned: false
        };

        setSessions(prev => [newSession, ...prev]);
        setCurrentSessionId(newId);
        setMessages([]);
        setInput("");
        setSelectedFile(null);
    };

    const togglePinSession = (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        const updatedSessions = sessions.map(s =>
            s.id === sessionId ? { ...s, isPinned: !s.isPinned } : s
        );
        setSessions(updatedSessions);
        if (user?.id && companyId) {
            localStorage.setItem(`chat_sessions_${companyId}_${user.id}`, JSON.stringify(updatedSessions));
        }
    };

    const deleteSession = (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        const updatedSessions = sessions.filter(s => s.id !== sessionId);
        setSessions(updatedSessions);

        // Cleanup messages
        if (user?.id) {
            localStorage.removeItem(`chat_messages_${user.id}_${sessionId}`);
        }

        // Cleanup index
        if (user?.id && companyId) {
            localStorage.setItem(`chat_sessions_${companyId}_${user.id}`, JSON.stringify(updatedSessions));
        }

        if (currentSessionId === sessionId) {
            if (updatedSessions.length > 0) {
                const nextSession = updatedSessions.filter(s => s.employeeId === selectedEmployeeId)[0];
                setCurrentSessionId(nextSession?.id || null);
            } else {
                setCurrentSessionId(null);
            }
        }
    };

    const filteredSessions = sessions
        .filter(s =>
            s.employeeId === selectedEmployeeId &&
            s.title.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return b.createdAt - a.createdAt;
        });

    return (
        <div className="flex h-full w-full bg-[#0d0d0d] text-gray-100 rounded-xl overflow-hidden border border-gray-800 shadow-2xl">
            {/* Sidebar */}
            <div className="w-64 bg-[#171717] border-r border-gray-800 flex flex-col hidden md:flex">
                <div className="p-4">
                    <Button
                        onClick={startNewChat}
                        variant="outline"
                        className="w-full justify-start gap-2 bg-transparent border-gray-700 hover:bg-gray-800 text-gray-300 hover:text-white"
                    >
                        <Plus className="w-4 h-4" />
                        Novo chat
                    </Button>
                </div>

                <div className="px-4 pb-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                        <Input
                            placeholder="Pesquisar chats..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-8 pl-8 bg-gray-900/50 border-gray-800 text-xs focus-visible:ring-indigo-500/30"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-2 space-y-1">
                    <div className="p-2 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                        <span>Conversas</span>
                        <span className="text-[10px] bg-gray-800 px-1.5 py-0.5 rounded text-gray-400">
                            {filteredSessions.length}
                        </span>
                    </div>
                    {filteredSessions.map(session => (
                        <div
                            key={session.id}
                            onClick={() => setCurrentSessionId(session.id)}
                            className={cn(
                                "group flex items-center gap-2 p-2 rounded-lg text-sm cursor-pointer transition-all border relative",
                                currentSessionId === session.id
                                    ? "bg-gray-800 text-white border-gray-700 shadow-sm"
                                    : "text-gray-400 border-transparent hover:bg-gray-800/60 hover:text-gray-200"
                            )}
                        >
                            <MessageSquare className={cn("w-4 h-4 flex-shrink-0", currentSessionId === session.id ? "text-indigo-400" : "text-gray-500")} />
                            <span className="truncate flex-1 pr-12">{session.title}</span>

                            <div className={cn(
                                "absolute right-2 flex items-center gap-1.5 transition-opacity",
                                currentSessionId === session.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                            )}>
                                <button
                                    onClick={(e) => togglePinSession(e, session.id)}
                                    className={cn(
                                        "p-1 rounded hover:bg-gray-700 transition-colors",
                                        session.isPinned ? "text-indigo-400" : "text-gray-500"
                                    )}
                                >
                                    <Plus className={cn("w-3 h-3 transition-transform", session.isPinned ? "rotate-45" : "")}
                                        style={{ transform: session.isPinned ? 'rotate(45deg)' : 'none' }} />
                                </button>
                                <button
                                    onClick={(e) => deleteSession(e, session.id)}
                                    className="p-1 rounded hover:bg-red-900/40 text-gray-500 hover:text-red-400 transition-colors"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {filteredSessions.length === 0 && (
                        <div className="p-4 text-center text-xs text-gray-600 italic">
                            Nenhuma conversa encontrada
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-800">
                    <div className="flex items-center gap-3 p-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold">
                            {user?.user_metadata?.name?.[0] || "U"}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-xs font-medium truncate">{user?.user_metadata?.name || "Usuário"}</p>
                            <p className="text-[10px] text-gray-500 truncate">{user?.email}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col relative h-[700px]">
                {/* Header */}
                <div className="h-14 border-b border-gray-800 flex items-center justify-between px-6 bg-[#0d0d0d]/80 backdrop-blur-md z-10 sticky top-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
                            <Bot className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold">Assistente RH Estratégico</h3>
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                <span className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">Online</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4 md:p-6" ref={scrollRef}>
                    <div className="max-w-3xl mx-auto space-y-8 pb-12">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                                <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mb-2">
                                    <Brain className="w-8 h-8 text-indigo-500" />
                                </div>
                                <h2 className="text-xl font-bold text-white">Olá! Sou seu assistente de RH.</h2>
                                <p className="text-gray-400 max-w-sm text-sm">
                                    Estou pronto para ajudar com insights estratégicos, análises de desempenho e suporte à decisão.
                                </p>
                                {selectedEmployeeId && selectedEmployeeId !== "all" && (
                                    <div className="mt-4 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300">
                                        Contexto ativo: <strong>{employeeName}</strong>
                                    </div>
                                )}
                            </div>
                        ) : (
                            messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={cn(
                                        "flex gap-4",
                                        msg.role === "assistant" ? "items-start" : "items-start flex-row-reverse"
                                    )}
                                >
                                    <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 shadow-sm",
                                        msg.role === "assistant"
                                            ? "bg-indigo-600 text-white"
                                            : "bg-gray-700 text-gray-200"
                                    )}>
                                        {msg.role === "assistant" ? <Bot className="w-5 h-5" /> : <User className="w-4 h-4" />}
                                    </div>
                                    <div className={cn(
                                        "max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed",
                                        msg.role === "assistant"
                                            ? "bg-[#171717] border border-gray-800 text-gray-200"
                                            : "bg-indigo-600 text-white shadow-lg"
                                    )}>
                                        <div className={cn(
                                            "prose prose-sm max-w-none",
                                            msg.role === "assistant" ? "prose-invert" : "text-white prose-headings:text-white prose-strong:text-white prose-p:text-white"
                                        )}>
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {msg.content}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                        {isLoading && (
                            <div className="flex gap-4 items-start">
                                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white animate-pulse">
                                    <Bot className="w-5 h-5" />
                                </div>
                                <div className="bg-[#171717] border border-gray-800 text-gray-400 rounded-2xl p-4 flex gap-1 items-center">
                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-600 animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-600 animate-bounce [animation-delay:0.2s]"></span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-600 animate-bounce [animation-delay:0.4s]"></span>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* Input Area */}
                <div className="p-4 md:p-6 bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d] to-transparent pt-10">
                    <div className="max-w-3xl mx-auto relative group">
                        {/* File Preview */}
                        {selectedFile && (
                            <div className="absolute -top-12 left-0 right-0 p-2 bg-[#1a1a1a] border border-gray-800 rounded-t-lg flex items-center justify-between animate-in slide-in-from-bottom-2">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <FileIcon className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                                    <span className="text-xs text-gray-300 truncate">{selectedFile.name}</span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-gray-500 hover:text-red-400"
                                    onClick={() => setSelectedFile(null)}
                                >
                                    <X className="w-3 h-3" />
                                </Button>
                            </div>
                        )}

                        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="w-8 h-8 text-gray-500 hover:text-gray-300 rounded-lg"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Paperclip className="w-4 h-4" />
                            </Button>
                        </div>
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSend()}
                            placeholder="Envie uma mensagem..."
                            className="w-full bg-[#171717] border-gray-800 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 rounded-xl h-14 pl-14 pr-14 text-sm text-gray-200 placeholder:text-gray-600 transition-all shadow-inner"
                        />
                        <Button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            className={cn(
                                "absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg p-0 transition-all",
                                input.trim() && !isLoading
                                    ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20 shadow-lg scale-100"
                                    : "bg-gray-800 text-gray-600 scale-95 opacity-50"
                            )}
                        >
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>
                    <p className="text-[10px] text-gray-600 text-center mt-3 font-medium uppercase tracking-[0.2em]">
                        OpsControl AI Agent • Estratégico v1.0
                    </p>
                </div>
            </div>
        </div>
    );
}
