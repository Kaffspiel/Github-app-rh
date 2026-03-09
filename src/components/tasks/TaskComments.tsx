import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TaskComment {
  id: string;
  task_id: string;
  employee_id: string;
  employee_name?: string;
  content: string;
  checklist_item_id?: string;
  created_at: string;
}

interface TaskCommentsProps {
  taskId: string;
  checklistItemId?: string;
  fetchComments: (taskId: string) => Promise<TaskComment[]>;
  addComment: (taskId: string, content: string, checklistItemId?: string) => Promise<boolean>;
}

export function TaskComments({ taskId, checklistItemId, fetchComments, addComment }: TaskCommentsProps) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadComments = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchComments(taskId);
      setComments(data);
    } finally {
      setIsLoading(false);
    }
  }, [taskId, fetchComments]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleSendComment = async () => {
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const success = await addComment(taskId, newComment, checklistItemId);
      if (success) {
        setNewComment("");
        await loadComments();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredComments = checklistItemId 
    ? comments.filter(c => c.checklist_item_id === checklistItemId)
    : comments;

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="flex flex-col h-[400px] border rounded-lg bg-gray-50 overflow-hidden">
      <div className="p-3 border-b bg-white flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-blue-600" />
        <h4 className="text-sm font-semibold">Comentários e Observações</h4>
      </div>

      <ScrollArea className="flex-1 p-4">
        {isLoading && comments.length === 0 ? (
          <div key="loading" className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
          </div>
        ) : filteredComments.length === 0 ? (
          <div key="empty" className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2 py-8">
            <MessageSquare className="w-8 h-8 opacity-20" />
            <p className="text-xs italic">
                <span key={checklistItemId ? "item" : "task"}>
                    {checklistItemId ? "Nenhum comentário neste item." : "Nenhum comentário na tarefa."}
                </span>
            </p>
          </div>
        ) : (
          <div key="list" className="space-y-4">
            {filteredComments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-[10px] bg-blue-100 text-blue-700">
                    {getInitials(comment.employee_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900">{comment.employee_name || "Usuário"}</span>
                    <span className="text-[10px] text-gray-500">
                      {format(new Date(comment.created_at), "dd MMM, HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border text-sm text-gray-700 shadow-sm leading-relaxed">
                    <span>{comment.content}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="p-3 bg-white border-t space-y-2">
        <Textarea
          placeholder="Digite seu comentário aqui..."
          className="resize-none min-h-[60px] text-sm"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => {
             if (e.key === 'Enter' && !e.shiftKey) {
                 e.preventDefault();
                 handleSendComment();
             }
          }}
        />
        <div className="flex justify-end">
          <Button 
            size="sm" 
            className="h-8 gap-2" 
            disabled={!newComment.trim() || isSubmitting}
            onClick={handleSendComment}
          >
            {isSubmitting ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Send className="w-3 h-3" />
            )}
            Enviar
          </Button>
        </div>
      </div>
    </div>
  );
}
